import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { PrismaClient, UserRole, Priority } from '@prisma/client';
import { createTicket, addComment } from '../src/services/ticketService';

const prisma = new PrismaClient();

describe('API Integration - Ticket Lifecycle', () => {
  let reporterId: string;
  let agentId: string;

  beforeAll(async () => {
    const reporter = await prisma.user.create({ data: { name: 'Test Reporter', email: 'test_rep_' + Date.now() + '@example.com', passwordHash: 'hash', role: UserRole.REPORTER } });
    const agent = await prisma.user.create({ data: { name: 'Test Agent', email: 'test_agt_' + Date.now() + '@example.com', passwordHash: 'hash', role: UserRole.AGENT } });
    reporterId = reporter.id;
    agentId = agent.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [reporterId, agentId] } } });
    await prisma.$disconnect();
  });

  test('create -> reporter comment -> agent comment -> verify firstResponseAt', async () => {
    const args = { title: 'Integration Test', description: 'Testing the SLA freeze', priority: Priority.HIGH };
    const ticket = await createTicket(prisma, args, reporterId);
    expect(ticket.firstResponseAt).toBeNull();

    await addComment(prisma, ticket.id, 'More info', reporterId);
    const afterReporter = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(afterReporter?.firstResponseAt).toBeNull();

    await addComment(prisma, ticket.id, 'Looking into it', agentId);
    const afterAgent = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(afterAgent?.firstResponseAt).not.toBeNull();

    // Cleanup
    await prisma.comment.deleteMany({ where: { ticketId: ticket.id } });
    await prisma.ticket.delete({ where: { id: ticket.id } });
  });
});
