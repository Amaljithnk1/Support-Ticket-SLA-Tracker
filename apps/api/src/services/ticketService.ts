import { PrismaClient, TicketStatus, Priority, UserRole, Ticket } from '@prisma/client';
import { AppError, ErrorCode } from '../errors';
import { calculateSlaTargets } from '@sla-tracker/sla-engine';


export async function createTicket(prisma: PrismaClient, args: { title: string, description: string, priority: Priority }, reporterId: string): Promise<Ticket> {
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
  const targets = calculateSlaTargets(createdAt, args.priority as unknown as import('@sla-tracker/sla-engine').Priority, timeZone, holidayDates);

  return prisma.ticket.create({
    data: {
      title: args.title,
      description: args.description,
      priority: args.priority,
      status: TicketStatus.OPEN,
      reporterId,
      firstResponseDueAt: targets.firstResponseDueAt,
      resolutionDueAt: targets.resolutionDueAt,
      firstResponseAtRiskAt: targets.firstResponseAtRiskAt,
      resolutionAtRiskAt: targets.resolutionAtRiskAt,
      createdAt,
    },
  });
}

export async function changeTicketStatus(prisma: PrismaClient, ticketId: string, status: TicketStatus): Promise<Ticket> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError('Ticket not found', ErrorCode.TICKET_NOT_FOUND);

  // Strict state machine validation
  const validTransitions: Record<TicketStatus, TicketStatus[]> = {
    OPEN: [TicketStatus.IN_PROGRESS],
    IN_PROGRESS: [TicketStatus.RESOLVED],
    RESOLVED: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
    CLOSED: [TicketStatus.OPEN], // Explicit reopen
  };

  if (!validTransitions[ticket.status].includes(status) && ticket.status !== status) {
    throw new AppError(`Invalid transition: Cannot move from ${ticket.status} to ${status}.`, ErrorCode.INVALID_STATUS_TRANSITION);
  }
  
  let resolvedAt = ticket.resolvedAt;
  let resolutionBreached = ticket.resolutionBreached;
  
  if ((status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) && !resolvedAt) {
    resolvedAt = new Date(); // Stamp resolution time!
    resolutionBreached = resolvedAt > ticket.resolutionDueAt;
  } else if (status === TicketStatus.OPEN || status === TicketStatus.IN_PROGRESS) {
    resolvedAt = null; // Un-resolve!
    resolutionBreached = null;
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status, resolvedAt, resolutionBreached },
  });
}

export async function assignTicket(prisma: PrismaClient, ticketId: string, assigneeId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError('Ticket not found', ErrorCode.TICKET_NOT_FOUND);

  const user = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!user) {
    throw new AppError('Assignee not found', ErrorCode.USER_NOT_FOUND);
  }
  if (user.role !== UserRole.AGENT) {
    throw new AppError('Assignee must be a valid Agent', ErrorCode.VALIDATION_ERROR);
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: { assigneeId },
  });
}

export async function resolveTicket(prisma: PrismaClient, ticketId: string) {
  return changeTicketStatus(prisma, ticketId, TicketStatus.RESOLVED);
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








