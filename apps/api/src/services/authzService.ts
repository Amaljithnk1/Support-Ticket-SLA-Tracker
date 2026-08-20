import { PrismaClient, UserRole } from '@prisma/client';
import { AppError, ErrorCode } from '../errors';
import * as authService from './authService';

export function requireAuth(user: any) {
  if (!user) {
    throw new AppError('You must be logged in to perform this action', ErrorCode.UNAUTHORIZED);
  }
}

export function requireRole(user: any, roles: UserRole[]) {
  requireAuth(user);
  if (!roles.includes(user.role)) {
    throw new AppError(`This action requires one of the following roles: ${roles.join(', ')}`, ErrorCode.FORBIDDEN);
  }
}
