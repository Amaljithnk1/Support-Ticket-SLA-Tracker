import { PrismaClient, UserRole, Priority, TicketStatus } from '@prisma/client';

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
  // Password hash for 'password123' (Dummy hash, in real app it would be generated via Argon2)
  const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummyhash$dummyhash'; 
  
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

  // 3. Create Dummy Tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'Payment failed during checkout',
      description: 'I tried to buy a widget but my card was declined with error code 500.',
      priority: Priority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      reporterId: reporter.id,
      assigneeId: agent.id,
      // For seeding, mock the due times (e.g. 1 business hour and 4 business hours from now)
      firstResponseDueAt: new Date(Date.now() + 60 * 60 * 1000), 
      resolutionDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      firstResponseAt: new Date(), // Mock that it was already responded to
    },
  });

  await prisma.ticket.create({
    data: {
      title: 'Cannot login to dashboard',
      description: 'Reset password link is not arriving in email.',
      priority: Priority.HIGH,
      status: TicketStatus.OPEN,
      reporterId: reporter.id,
      firstResponseDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000), 
      resolutionDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
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
