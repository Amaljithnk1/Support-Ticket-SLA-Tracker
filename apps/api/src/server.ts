import { createServer } from 'http';
import { createYoga } from 'graphql-yoga';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolvers } from './resolvers';
import { createDataLoaders } from './dataloaders';
import { verifyToken } from './services/authService';
import { makeExecutableSchema } from '@graphql-tools/schema';

const prisma = new PrismaClient();
const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');

export interface GraphQLContext {
  prisma: PrismaClient;
  currentUser: { userId: string; role: string } | null; 
  dataloaders: ReturnType<typeof createDataLoaders>;
}

const executableSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const yoga = createYoga({
  schema: executableSchema,
  context: (req) => {
    // Per-request Context Factory
    const authHeader = req.request.headers.get('authorization');
    let currentUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      currentUser = verifyToken(token);
    }

    return {
      prisma,
      currentUser,
      dataloaders: createDataLoaders(prisma),
    };
  },
});

const server = createServer(yoga);

server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql');
});
