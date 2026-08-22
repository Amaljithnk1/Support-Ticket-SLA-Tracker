import { PrismaClient, TicketStatus, Priority, UserRole } from '@prisma/client';
import { AppError, ErrorCode } from '../errors';
import { calculateSlaTargets, calculateSlaState, getElapsedBusinessMinutes } from '@sla-tracker/sla-engine';
import { SLA_POLICIES } from '@sla-tracker/sla-engine';

export async function createTicket(prisma: PrismaClient, args: any, reporterId: string) {
  if (!args.title || args.title.trim() === '') {
    throw new AppError('Title cannot be empty', ErrorCode.VALIDATION_ERROR);
  }
  if (!args.description || args.description.trim() === '') {
    throw new AppError('Description cannot be empty', ErrorCode.VALIDATION_ERROR);
  }

  const timeZone = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
  const holidays = await prisma.holiday.findMany();
  const holidayDates = holidays.map(h => h.date);

  const createdAt = new Date();
  
  // Calculate Target SLAs mathematically at creation!
  const targets = calculateSlaTargets(createdAt, args.priority as any, timeZone, holidayDates);

  return prisma.ticket.create({
    data: {
      title: args.title,
      description: args.description,
      priority: args.priority,
      status: TicketStatus.OPEN,
      reporterId,
      firstResponseDueAt: targets.firstResponseDueAt,
      resolutionDueAt: targets.resolutionDueAt,
      createdAt,
    },
  });
}

export async function changeTicketStatus(prisma: PrismaClient, ticketId: string, status: TicketStatus) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError('Ticket not found', ErrorCode.TICKET_NOT_FOUND);

  // Validate state transitions
  if (ticket.status === TicketStatus.CLOSED && status === TicketStatus.IN_PROGRESS) {
    throw new AppError('Ticket cannot transition from CLOSED to IN_PROGRESS.', ErrorCode.INVALID_STATUS_TRANSITION);
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status },
  });
}

export async function assignTicket(prisma: PrismaClient, ticketId: string, assigneeId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError('Ticket not found', ErrorCode.TICKET_NOT_FOUND);

  const user = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!user || user.role !== UserRole.AGENT) {
    throw new AppError('Assignee must be a valid Agent', ErrorCode.VALIDATION_ERROR);
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: { assigneeId },
  });
}

export async function resolveTicket(prisma: PrismaClient, ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError('Ticket not found', ErrorCode.TICKET_NOT_FOUND);
  
  if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
    return ticket; // Already resolved
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: { 
      status: TicketStatus.RESOLVED,
      resolvedAt: new Date() // Freeze SLA
    },
  });
}

export async function addComment(prisma: PrismaClient, ticketId: string, content: string, authorId: string) {
  if (!content || content.trim() === '') {
    throw new AppError('Comment content cannot be empty', ErrorCode.VALIDATION_ERROR);
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { reporter: true } });
  if (!ticket) throw new AppError('Ticket not found', ErrorCode.TICKET_NOT_FOUND);

  const comment = await prisma.comment.create({
    data: { content, ticketId, authorId },
  });

  // Stamp first response if it's the first agent comment
  if (!ticket.firstResponseAt) {
    const author = await prisma.user.findUnique({ where: { id: authorId } });
    if (author?.role === UserRole.AGENT) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { firstResponseAt: new Date() },
      });
    }
  }

  return comment;
}
