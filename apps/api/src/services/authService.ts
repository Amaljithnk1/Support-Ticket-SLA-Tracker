import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppError, ErrorCode } from '../errors';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function register(prisma: PrismaClient, args: Record<string, string>) {
  const existingUser = await prisma.user.findUnique({ where: { email: args.email } });
  if (existingUser) {
    throw new AppError('Email already in use', ErrorCode.VALIDATION_ERROR);
  }

  const passwordHash = await bcrypt.hash(args.password, 10);
  
  const user = await prisma.user.create({
    data: {
      name: args.name,
      email: args.email,
      passwordHash,
      role: args.role as UserRole,
    },
  });

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return { token, user };
}

export async function login(prisma: PrismaClient, args: Record<string, string>) {
  const user = await prisma.user.findUnique({ where: { email: args.email } });
  if (!user) {
    throw new AppError('Invalid email or password', ErrorCode.USER_NOT_FOUND);
  }

  const valid = await bcrypt.compare(args.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', ErrorCode.UNAUTHORIZED);
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return { token, user };
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string, role: UserRole };
  } catch {
    return null;
  }
}


