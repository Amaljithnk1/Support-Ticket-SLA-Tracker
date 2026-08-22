import { PrismaClient, UserRole, Priority, TicketStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Holidays
  await prisma.holiday.upsert({
    where: { date: new Date('2026-08-15T00:00:00Z') },
    update: {},
    create: {
      date: new Date('2026-08-15T00:00:00Z'),
      name: 'Independence Day',
    },
  });

  // 2. Create Users
  const dummyHash = await bcrypt.hash('password123', 10);
  
  const reporter = await prisma.user.upsert({
    where: { email: 'reporter@example.com' },
    update: {},
    create: {
      email: 'reporter@example.com',
      name: 'John Reporter',
      passwordHash: dummyHash,
      role: UserRole.REPORTER,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@example.com' },
    update: {},
    create: {
      email: 'agent@example.com',
      name: 'Alice Agent',
      passwordHash: dummyHash,
      role: UserRole.AGENT,
    },
  });

  const agent2 = await prisma.user.upsert({
    where: { email: 'agent2@example.com' },
    update: {},
    create: {
      email: 'agent2@example.com',
      name: 'Bob Agent',
      passwordHash: dummyHash,
      role: UserRole.AGENT,
    },
  });

  const agent3 = await prisma.user.upsert({
    where: { email: 'agent3@example.com' },
    update: {},
    create: {
      email: 'agent3@example.com',
      name: 'Charlie Agent',
      passwordHash: dummyHash,
      role: UserRole.AGENT,
    },
  });


  // 3. Create Dummy Tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'Payment failed during checkout',
      description: 'I tried to buy a widget but my card was declined with error code 500.',
      priority: Priority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      reporterId: reporter.id,
      assigneeId: agent.id,
      firstResponseDueAt: new Date(Date.now() + 60 * 60 * 1000), 
      resolutionDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      firstResponseAtRiskAt: new Date(Date.now() + 45 * 60 * 1000),
      resolutionAtRiskAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      firstResponseAt: new Date(),
      firstResponseBreached: false, // Met SLA
    },
  });

  await prisma.ticket.create({
    data: {
      title: 'Cannot login to dashboard',
      description: 'Reset password link is not arriving in email.',
      priority: Priority.HIGH,
      status: TicketStatus.OPEN,
      reporterId: reporter.id,
      assigneeId: agent2.id,
      firstResponseDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000), 
      resolutionDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      firstResponseAtRiskAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      resolutionAtRiskAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
    },
  });

  // Mock Friday Data for the Chart
  const friday = new Date();
  friday.setDate(friday.getDate() - 1); // Yesterday (Friday)

  await prisma.ticket.create({
    data: {
      title: 'Missing attachment on invoice',
      description: 'The invoice I downloaded has no PDF attached.',
      priority: Priority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      reporterId: reporter.id,
      assigneeId: agent.id,
      createdAt: friday,
      firstResponseDueAt: new Date(friday.getTime() + 8 * 60 * 60 * 1000),
      resolutionDueAt: new Date(friday.getTime() + 48 * 60 * 60 * 1000),
      firstResponseAtRiskAt: new Date(friday.getTime() + 6 * 60 * 60 * 1000),
      resolutionAtRiskAt: new Date(friday.getTime() + 36 * 60 * 60 * 1000),
      firstResponseAt: new Date(friday.getTime() + 60 * 60 * 1000), // MET (Responded in 1 hr)
      firstResponseBreached: false,
    },
  });

  await prisma.ticket.create({
    data: {
      title: 'API endpoint returning 500',
      description: 'The /users endpoint is completely down.',
      priority: Priority.URGENT,
      status: TicketStatus.OPEN,
      reporterId: reporter.id,
      assigneeId: agent3.id,
      createdAt: friday,
      firstResponseDueAt: new Date(friday.getTime() + 1 * 60 * 60 * 1000), // Due in 1 hr
      resolutionDueAt: new Date(friday.getTime() + 4 * 60 * 60 * 1000),
      firstResponseAtRiskAt: new Date(friday.getTime() + 45 * 60 * 1000),
      resolutionAtRiskAt: new Date(friday.getTime() + 3 * 60 * 60 * 1000),
      // No firstResponseAt, and since Friday is in the past, this will naturally be BREACHED!
    },
  });

  await prisma.ticket.create({
    data: {
      title: 'Update documentation typos',
      description: 'Found some minor typos in the README.',
      priority: Priority.LOW,
      status: TicketStatus.OPEN,
      reporterId: reporter.id,
      firstResponseDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), 
      resolutionDueAt: new Date(Date.now() + 120 * 60 * 60 * 1000),
      firstResponseAtRiskAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
      resolutionAtRiskAt: new Date(Date.now() + 90 * 60 * 60 * 1000),
    }
  });

  // 4. Create Comments
  await prisma.comment.create({
    data: {
      content: 'I am looking into this right now.',
      ticketId: ticket1.id,
      authorId: agent.id,
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
