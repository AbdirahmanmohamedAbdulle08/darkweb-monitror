import type { Request, Response, NextFunction } from 'express';
import { db } from '../database/db.ts';
import type { UserProfile } from '../../src/types/index.ts';

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

// In-memory token session map: token -> userId
export const sessionStore = new Map<string, { userId: string; expiresAt: Date }>();

export function generateSessionToken(userId: string): string {
  const token = 'dw_sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  sessionStore.set(token, {
    userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days
  });
  return token;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const session = sessionStore.get(token);

  if (!session) {
    return next();
  }

  if (new Date() > session.expiresAt) {
    sessionStore.delete(token);
    return next();
  }

  const user = db.getUserById(session.userId);
  if (user) {
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required. Please sign in to access this resource.' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden. Administrative privileges required.' });
    return;
  }
  next();
}
