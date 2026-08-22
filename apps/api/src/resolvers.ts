import { UserRole, TicketStatus, Ticket, Comment, Priority } from '@prisma/client';
import { requireAuth, requireRole } from './services/authzService';
import * as authService from './services/authService';
import * as ticketService from './services/ticketService';
import { calculateSlaState, getElapsedBusinessMinutes } from '@sla-tracker/sla-engine';
import { SLA_POLICIES } from '@sla-tracker/sla-engine';
import type { GraphQLContext } from './server';

export const resolvers = {
  Query: {
    slaTrend: async (_: unknown, args: { days: number }, context: GraphQLContext) => {
      requireAuth(context.currentUser);
      const { days } = args;
      const prisma = context.prisma;
      
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      
      const tickets = await prisma.ticket.findMany({
        where: { createdAt: { gte: cutoff } },
        orderBy: { createdAt: 'asc' }
      });

      const trends = new Map<string, { date: string; met: number; breached: number }>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        trends.set(dayStr, { date: dayStr, met: 0, breached: 0 });
      }

      const now = new Date();
      for (const t of tickets) {
        const dayStr = t.createdAt.toLocaleDateString('en-US', { weekday: 'short' });
        if (!trends.has(dayStr)) continue;
        const stats = trends.get(dayStr)!;
        
        if (t.resolvedAt) {
          if (t.resolvedAt <= t.resolutionDueAt) stats.met++;
          else stats.breached++;
        } else {
          if (now > t.resolutionDueAt) stats.breached++;
        }
      }

      return Array.from(trends.values());
    },
    tickets: async (_: unknown, args: { status?: string, priority?: string, assigneeId?: string, slaState?: string, take?: number, cursor?: string }, context: GraphQLContext) => {
      const { status, priority, assigneeId, slaState, cursor } = args;
      const take = args.take || 10;
      const prisma = context.prisma;

      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (assigneeId) where.assigneeId = assigneeId;

      const dbOrderBy: Record<string, unknown> = { createdAt: 'desc' };

      if (!slaState) {
        const queryArgs: Record<string, unknown> = { where, take: take + 1, orderBy: dbOrderBy };
        if (cursor) {
          queryArgs.cursor = { id: cursor };
          queryArgs.skip = 1;
        }
        
        const results = await prisma.ticket.findMany(queryArgs as Parameters<typeof prisma.ticket.findMany>[0]);
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

      const MAX_OVERFETCH = take * 5;
      const queryArgs: Record<string, unknown> = { where, take: MAX_OVERFETCH, orderBy: dbOrderBy };
      if (cursor) {
        queryArgs.cursor = { id: cursor };
        queryArgs.skip = 1;
      }

      const results = await prisma.ticket.findMany(queryArgs as Parameters<typeof prisma.ticket.findMany>[0]);
      const timeZone = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
      const holidays = await prisma.holiday.findMany();
      const holidayDates = holidays.map(h => h.date);
      const now = new Date();
      
      const filtered = results.filter(ticket => {
        const policy = SLA_POLICIES[ticket.priority as keyof typeof SLA_POLICIES];
        const frState = calculateSlaState(ticket.firstResponseDueAt, ticket.firstResponseAt, now, policy.firstResponseHours * 60, ticket.createdAt, timeZone, holidayDates);
        const resState = calculateSlaState(ticket.resolutionDueAt, ticket.resolvedAt, now, policy.resolutionHours * 60, ticket.createdAt, timeZone, holidayDates);
        
        return frState === slaState || resState === slaState;
      });

      const nodes = filtered.slice(0, take);
      const hasNextPage = filtered.length > take;

      return {
        nodes,
        pageInfo: {
          hasNextPage,
          endCursor: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
        }
      }
    },
    ticket: (_: unknown, args: { id: string }, context: GraphQLContext) => context.prisma.ticket.findUnique({ where: { id: args.id } }),
    users: (_: unknown, args: { role: UserRole }, context: GraphQLContext) => context.prisma.user.findMany({ where: { role: args.role } }),
    holidays: (_: unknown, args: Record<string, unknown>, context: GraphQLContext) => context.prisma.holiday.findMany(),
    dashboard: async (_: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
      const tickets = await context.prisma.ticket.findMany();
      const timeZone = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
      const holidays = await context.prisma.holiday.findMany();
      const holidayDates = holidays.map(h => h.date);
      const now = new Date();
      
      let open = 0, inProgress = 0, atRisk = 0, breached = 0;
      
      for (const t of tickets) {
        if (t.status === 'OPEN') open++;
        if (t.status === 'IN_PROGRESS') inProgress++;
        
        const firstResponseState = calculateSlaState(t.firstResponseDueAt, t.firstResponseAt, now, t.priority === 'URGENT' ? 60 : t.priority === 'HIGH' ? 240 : t.priority === 'MEDIUM' ? 480 : 1440, t.createdAt, timeZone, holidayDates);
        const resolutionState = calculateSlaState(t.resolutionDueAt, t.resolvedAt, now, t.priority === 'URGENT' ? 240 : t.priority === 'HIGH' ? 1440 : t.priority === 'MEDIUM' ? 2880 : 7200, t.createdAt, timeZone, holidayDates);
        
        if (firstResponseState === 'BREACHED' || resolutionState === 'BREACHED') {
          breached++;
        } else if (firstResponseState === 'AT_RISK' || resolutionState === 'AT_RISK') {
          atRisk++;
        }
      }
      
      return { openTickets: open, inProgressTickets: inProgress, atRiskTickets: atRisk, breachedTickets: breached }
    }
  },
  Mutation: {
    createTicket: async (_: unknown, args: { title: string, description: string, priority: Priority }, context: GraphQLContext) => {
      requireAuth(context.currentUser);
      return ticketService.createTicket(context.prisma, args, context.currentUser.userId);
    },
    changeTicketStatus: async (_: unknown, args: { ticketId: string, status: TicketStatus }, context: GraphQLContext) => {
      requireRole(context.currentUser, [UserRole.AGENT]);
      return ticketService.changeTicketStatus(context.prisma, args.ticketId, args.status);
    },
    assignTicket: async (_: unknown, args: { ticketId: string, assigneeId: string }, context: GraphQLContext) => {
      requireRole(context.currentUser, [UserRole.AGENT]);
      return ticketService.assignTicket(context.prisma, args.ticketId, args.assigneeId);
    },
    resolveTicket: async (_: unknown, args: { ticketId: string }, context: GraphQLContext) => {
      requireRole(context.currentUser, [UserRole.AGENT]);
      return ticketService.resolveTicket(context.prisma, args.ticketId);
    },
    addComment: async (_: unknown, args: { ticketId: string, content: string }, context: GraphQLContext) => {
      requireAuth(context.currentUser);
      return ticketService.addComment(context.prisma, args.ticketId, args.content, context.currentUser.userId);
    },
    login: async (_: unknown, args: Record<string, string>, context: GraphQLContext) => {
      return authService.login(context.prisma, args);
    },
    register: async (_: unknown, args: Record<string, string>, context: GraphQLContext) => {
      return authService.register(context.prisma, args);
    }
  },
  Ticket: {
    reporter: (parent: Ticket, _: unknown, context: GraphQLContext) => context.dataloaders.userLoader.load(parent.reporterId),
    assignee: (parent: Ticket, _: unknown, context: GraphQLContext) => parent.assigneeId ? context.dataloaders.userLoader.load(parent.assigneeId) : null,
    comments: (parent: Ticket, _: unknown, context: GraphQLContext) => context.dataloaders.commentLoader.load(parent.id),
    sla: async (parent: Ticket, _: unknown, context: GraphQLContext) => {
      const timeZone = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
      const holidays = await context.prisma.holiday.findMany();
      const holidayDates = holidays.map(h => h.date);
      const now = new Date();
      now.setSeconds(0, 0);
      const policy = SLA_POLICIES[parent.priority as keyof typeof SLA_POLICIES];

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
    createdAt: (parent: Ticket) => parent.createdAt.toISOString(),
    firstResponseAt: (parent: Ticket) => parent.firstResponseAt?.toISOString(),
    resolvedAt: (parent: Ticket) => parent.resolvedAt?.toISOString(),
  },
  Comment: {
    author: (parent: Comment, _: unknown, context: GraphQLContext) => context.dataloaders.userLoader.load(parent.authorId),
    createdAt: (parent: Comment) => parent.createdAt.toISOString(),
  }
};



