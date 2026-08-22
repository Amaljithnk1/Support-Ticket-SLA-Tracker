import { UserRole } from '@prisma/client';
import { AppError, ErrorCode } from '../errors';

export function requireAuth(user: { userId: string, role: UserRole } | null) {
  if (!user) {
    throw new AppError('Unauthorized', ErrorCode.UNAUTHORIZED);
  }
}

export function requireRole(user: { userId: string, role: UserRole } | null, roles: UserRole[]) {
  requireAuth(user);
  if (!roles.includes(user!.role)) {
    throw new AppError('Forbidden', ErrorCode.FORBIDDEN);
  }
}
