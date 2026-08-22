import { UserRole } from '@prisma/client';
import { AppError, ErrorCode } from '../errors';

export function requireAuth(user: { userId: string; role: string } | null): asserts user is { userId: string; role: string } {
  if (!user) {
    throw new AppError('Unauthorized', ErrorCode.UNAUTHORIZED);
  }
}

export function requireRole(user: { userId: string; role: string } | null, allowedRoles: UserRole[]): asserts user is { userId: string; role: string } {
  requireAuth(user);
  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new AppError('Forbidden: Insufficient permissions', ErrorCode.FORBIDDEN);
  }
}
