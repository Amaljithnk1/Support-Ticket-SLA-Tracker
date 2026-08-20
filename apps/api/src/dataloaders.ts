import DataLoader from 'dataloader';
import { PrismaClient, User, Comment } from '@prisma/client';

// We export a factory function so a fresh instance is created PER REQUEST in the context
export function createDataLoaders(prisma: PrismaClient) {
  return {
    userLoader: new DataLoader<string, User | null>(async (userIds) => {
      const users = await prisma.user.findMany({
        where: { id: { in: [...userIds] } },
      });
      // DataLoader requires an array of results in the exact same order and length as the requested keys
      const userMap = new Map(users.map(u => [u.id, u]));
      return userIds.map(id => userMap.get(id) || null);
    }),
    
    commentLoader: new DataLoader<string, Comment[]>(async (ticketIds) => {
      const comments = await prisma.comment.findMany({
        where: { ticketId: { in: [...ticketIds] } },
        orderBy: { createdAt: 'asc' }
      });
      const grouped = new Map<string, Comment[]>();
      for (const comment of comments) {
        if (!grouped.has(comment.ticketId)) {
          grouped.set(comment.ticketId, []);
        }
        grouped.get(comment.ticketId)!.push(comment);
      }
      return ticketIds.map(id => grouped.get(id) || []);
    })
  };
}
