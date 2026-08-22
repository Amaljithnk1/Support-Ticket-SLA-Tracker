import { PrismaClient, UserRole } from '@prisma/client';
import { requireAuth, requireRole } from './services/authzService';
import * as authService from './services/authService';
import * as ticketService from './services/ticketService';
import { calculateSlaState, getElapsedBusinessMinutes } from '@sla-tracker/sla-engine';
import { SLA_POLICIES } from '@sla-tracker/sla-engine';

export const resolvers = {
  Query: {
    slaTrend: async (_: any, args: any, context: any) => {
      requireAuth(context.currentUser);
      const { days } = args;
      const prisma = context.prisma as PrismaClient;
      
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      
      const tickets = await prisma.ticket.findMany({
        where: { createdAt: { gte: cutoff } },
        orderBy: { createdAt: 'asc' }
      });
      
      const trends = new Map<string, { met: number, breached: number }>();
      const now = new Date();
      now.setSeconds(0,0);
      
      // Pre-fill the last 7 days so the UI chart always has a timeline to draw
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        trends.set(dayStr, { met: 0, breached: 0 });
      }
      
      for (const t of tickets) {
        const day = new Date(t.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
        if (!trends.has(day)) continue; // ignore tickets outside the strict boundary
        const stats = trends.get(day)!;
        
        if (t.resolvedAt) {
          if (t.resolvedAt <= t.resolutionDueAt) stats.met++;
          else stats.breached++;
        } else {
          if (now > t.resolutionDueAt) stats.breached++;
          // If now <= dueAt, it's pending. Ignore it completely!
        }
      }
      
      return Array.from(trends.entries()).map(([date, counts]) => ({
        date,
        met: counts.met,
        breached: counts.breached
      }));
    },
    tickets: async (_: any, args: any, context: any) => {
      const { status, priority, assigneeId, slaState, orderBy, take = 10, cursor } = args;
      const prisma = context.prisma as PrismaClient;
      
      const where: any = {};
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (assigneeId) where.assigneeId = assigneeId;

      let dbOrderBy: any = { createdAt: 'desc' };
      if (orderBy === 'CREATED_AT_ASC') dbOrderBy = { createdAt: 'asc' };
      if (orderBy === 'CREATED_AT_DESC') dbOrderBy = { createdAt: 'desc' };
      if (orderBy === 'PRIORITY_DESC') dbOrderBy = { priority: 'desc' };

      // If we are not filtering by SLA State, we can just use pure DB pagination.
      if (!slaState) {
        const queryArgs: any = { where, take: take + 1, orderBy: dbOrderBy };
        if (cursor) {
          queryArgs.cursor = { id: cursor };
          queryArgs.skip = 1; // skip the cursor itself
        }
        
        const results = await prisma.ticket.findMany(queryArgs);
        const hasNextPage = results.length > take;
        const nodes = hasNextPage ? results.slice(0, -1) : results;
        return {
          nodes,
          pageInfo: {
            hasNextPage,
            endCursor: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
          }
        };
      }

      // If we ARE filtering by SLA state, we must over-fetch and filter in memory.
      // We will over-fetch up to take * 5 (Known limitation documented in README).
      const MAX_OVERFETCH = take * 5;
      const queryArgs: any = { where, take: MAX_OVERFETCH, orderBy: dbOrderBy };
      if (cursor) {
        queryArgs.cursor = { id: cursor };
        queryArgs.skip = 1;
      }

      const results = await prisma.ticket.findMany(queryArgs);
      const timeZone = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
      const holidays = await prisma.holiday.findMany();
      const holidayDates = holidays.map(h => h.date);
      const now = new Date();
      
      const filtered = results.filter(ticket => {
        const policy = SLA_POLICIES[ticket.priority as any];
        const frState = calculateSlaState(ticket.firstResponseDueAt, ticket.firstResponseAt, now, policy.firstResponseHours * 60, ticket.createdAt, timeZone, holidayDates);
        const resState = calculateSlaState(ticket.resolutionDueAt, ticket.resolvedAt, now, policy.resolutionHours * 60, ticket.createdAt, timeZone, holidayDates);
        
        // Match if EITHER state matches (or we could make it specific in a real app)
        return frState === slaState || resState === slaState;
      });

      const nodes = filtered.slice(0, take);
      const hasNextPage = filtered.length > take; // Roughly estimating if we hit the limit

      return {
        nodes,
        pageInfo: {
          hasNextPage,
          endCursor: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
        }
      }
    },
    ticket: (_: any, args: any, context: any) => context.prisma.ticket.findUnique({ where: { id: args.id } }),
    users: (_: any, args: any, context: any) => context.prisma.user.findMany({ where: { role: args.role } }),
    holidays: (_: any, args: any, context: any) => context.prisma.holiday.findMany(),
    dashboard: async (_: any, args: any, context: any) => {
      const tickets = await context.prisma.ticket.findMany();
      const timeZone = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
      const holidays = await context.prisma.holiday.findMany();
      const holidayDates = holidays.map((h: any) => h.date);
      const now = new Date();
      
      let open = 0, inProgress = 0, atRisk = 0, breached = 0;
      
      for (const t of tickets) {
        if (t.status === 'OPEN') open++;
        if (t.status === 'IN_PROGRESS') inProgress++;
        
        // Calculate dynamic SLA state to power the dashboard metrics
        const firstResponseState = calculateSlaState(t.firstResponseDueAt, t.firstResponseAt, now, t.priority === 'URGENT' ? 60 : t.priority === 'HIGH' ? 240 : t.priority === 'MEDIUM' ? 480 : 1440, t.createdAt, timeZone, holidayDates);
        const resolutionState = calculateSlaState(t.resolutionDueAt, t.resolvedAt, now, t.priority === 'URGENT' ? 240 : t.priority === 'HIGH' ? 1440 : t.priority === 'MEDIUM' ? 2880 : 7200, t.createdAt, timeZone, holidayDates);
        
        if (firstResponseState === 'BREACHED' || resolutionState === 'BREACHED') {
          breached++;
        } else if (firstResponseState === 'AT_RISK' || resolutionState === 'AT_RISK') {
          atRisk++;
        }
      }
      
      return {
        openTickets: open,
        inProgressTickets: inProgress,
        atRiskTickets: atRisk,
        breachedTickets: breached,
      }
    }
  },
  Mutation: {
    createTicket: async (_: any, args: any, context: any) => {
      requireAuth(context.currentUser);
      return ticketService.createTicket(context.prisma, args, context.currentUser.userId);
    },
    changeTicketStatus: async (_: any, args: any, context: any) => {
      requireRole(context.currentUser, [UserRole.AGENT]);
      return ticketService.changeTicketStatus(context.prisma, args.ticketId, args.status);
    },
    assignTicket: async (_: any, args: any, context: any) => {
      requireRole(context.currentUser, [UserRole.AGENT]);
      return ticketService.assignTicket(context.prisma, args.ticketId, args.assigneeId);
    },
    resolveTicket: async (_: any, args: any, context: any) => {
      requireRole(context.currentUser, [UserRole.AGENT]);
      return ticketService.resolveTicket(context.prisma, args.ticketId);
    },
    addComment: async (_: any, args: any, context: any) => {
      requireAuth(context.currentUser);
      return ticketService.addComment(context.prisma, args.ticketId, args.content, context.currentUser.userId);
    },
    login: async (_: any, args: any, context: any) => {
      return authService.login(context.prisma, args);
    },
    register: async (_: any, args: any, context: any) => {
      return authService.register(context.prisma, args);
    }
  },
  Ticket: {
    reporter: (parent: any, _: any, context: any) => context.dataloaders.userLoader.load(parent.reporterId),
    assignee: (parent: any, _: any, context: any) => parent.assigneeId ? context.dataloaders.userLoader.load(parent.assigneeId) : null,
    comments: (parent: any, _: any, context: any) => context.dataloaders.commentLoader.load(parent.id),
    sla: async (parent: any, _: any, context: any) => {
      const timeZone = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
      const holidays = await context.prisma.holiday.findMany(); // In production, we'd cache this
      const holidayDates = holidays.map((h: any) => h.date);
      const now = new Date();
      now.setSeconds(0, 0);
      const policy = SLA_POLICIES[parent.priority as any];

      const frState = calculateSlaState(parent.firstResponseDueAt, parent.firstResponseAt, now, policy.firstResponseHours * 60, parent.createdAt, timeZone, holidayDates);
      const resState = calculateSlaState(parent.resolutionDueAt, parent.resolvedAt, now, policy.resolutionHours * 60, parent.createdAt, timeZone, holidayDates);
      
      const frRemaining = parent.firstResponseAt ? 0 : Math.max(0, getElapsedBusinessMinutes(now, parent.firstResponseDueAt, timeZone, holidayDates));
      const resRemaining = parent.resolvedAt ? 0 : Math.max(0, getElapsedBusinessMinutes(now, parent.resolutionDueAt, timeZone, holidayDates));

      return {
        firstResponseDueAt: parent.firstResponseDueAt.toISOString(),
        resolutionDueAt: parent.resolutionDueAt.toISOString(),
        firstResponseState: frState,
        resolutionState: resState,
        firstResponseRemainingMinutes: frRemaining,
        resolutionRemainingMinutes: resRemaining
      };
    },
    createdAt: (parent: any) => parent.createdAt.toISOString(),
    firstResponseAt: (parent: any) => parent.firstResponseAt?.toISOString(),
    resolvedAt: (parent: any) => parent.resolvedAt?.toISOString(),
  },
  Comment: {
    author: (parent: any, _: any, context: any) => context.dataloaders.userLoader.load(parent.authorId),
    createdAt: (parent: any) => parent.createdAt.toISOString(),
  }
};
