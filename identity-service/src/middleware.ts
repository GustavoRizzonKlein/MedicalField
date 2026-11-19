import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

export interface AuthenticatedProfessional {
  id: string;
  name: string;
  registryType: string;
  registryNumber: string;
  role: 'ADMIN' | 'RESPONDER';
}

declare global {
  namespace Express {
    interface Request {
      professional?: AuthenticatedProfessional;
    }
  }
}

/**
 * Access log (LGPD): records every request once the response is finished, so it knows
 * the final status code and duration. It runs first in the chain, but reads the
 * professional set later by the auth middleware.
 */
export function accessLog(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();
  const occurredAt = new Date();

  res.on('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
    const entry = {
      occurredAt: occurredAt.toISOString(),
      clientIp: req.ip ?? 'unknown',
      professionalId: req.professional?.id ?? null,
      method: req.method,
      route: req.originalUrl.split('?')[0],
      statusCode: res.statusCode,
      durationMs,
    };
    console.log(JSON.stringify({ type: 'access', service: 'identity', ...entry }));
    pool
      .query(
        `INSERT INTO access_log (occurred_at, client_ip, professional_id, method, route, status_code, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [occurredAt, entry.clientIp, entry.professionalId, entry.method, entry.route, entry.statusCode, durationMs],
      )
      .catch((error: unknown) => console.error('[access-log] failed to store entry', error));
  });

  next();
}

/** Requires a valid Bearer token on every route except the public ones. */
export function authenticate(publicKey: string, publicRoutes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (publicRoutes.includes(`${req.method} ${req.path}`)) {
      next();
      return;
    }

    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: 'Missing Bearer token' });
      return;
    }

    try {
      const claims = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
      req.professional = {
        id: String(claims.sub),
        name: claims.name,
        registryType: claims.registryType,
        registryNumber: claims.registryNumber,
        role: claims.role,
      };
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.professional?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Administrator role required' });
    return;
  }
  next();
}
