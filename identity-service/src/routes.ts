import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2/promise';
import { config } from './config.js';
import { pool } from './db.js';
import { requireAdmin } from './middleware.js';

interface ProfessionalRow extends RowDataPacket {
  id: string;
  full_name: string;
  registry_type: string;
  registry_number: string;
  role: 'ADMIN' | 'RESPONDER';
  password_hash: string;
  active: number;
}

function toProfessional(row: ProfessionalRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    registryType: row.registry_type,
    registryNumber: row.registry_number,
    role: row.role,
  };
}

function clampLimit(value: unknown): number {
  const limit = Number(value ?? 100);
  return Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 100;
}

export function createRoutes(privateKey: string): Router {
  const router = Router();

  // Public route: exchanges registry number + password for a signed JWT.
  router.post('/auth/login', async (req, res) => {
    const { registryNumber, password } = req.body ?? {};
    if (typeof registryNumber !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'registryNumber and password are required' });
      return;
    }

    const [rows] = await pool.query<ProfessionalRow[]>(
      'SELECT * FROM professional WHERE registry_number = ? AND active = TRUE',
      [registryNumber.trim()],
    );
    const row = rows[0];
    // Same message for unknown user and wrong password, so the API does not reveal which registries exist.
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const professional = toProfessional(row);
    const expiresInSeconds = config.jwt.ttlHours * 3600;
    const token = jwt.sign(
      {
        name: professional.fullName,
        registryType: professional.registryType,
        registryNumber: professional.registryNumber,
        role: professional.role,
      },
      privateKey,
      { algorithm: 'RS256', subject: professional.id, issuer: config.jwt.issuer, expiresIn: expiresInSeconds },
    );

    req.professional = { ...professional, name: professional.fullName };
    res.json({
      token,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      professional,
    });
  });

  router.get('/auth/me', async (req, res) => {
    const [rows] = await pool.query<ProfessionalRow[]>('SELECT * FROM professional WHERE id = ?', [req.professional!.id]);
    if (!rows[0]) {
      res.status(404).json({ error: 'Professional not found' });
      return;
    }
    res.json(toProfessional(rows[0]));
  });

  router.get('/professionals', async (_req, res) => {
    const [rows] = await pool.query<ProfessionalRow[]>('SELECT * FROM professional ORDER BY full_name');
    res.json(rows.map(toProfessional));
  });

  // Receives logs the client recorded while offline. Entries already received are ignored.
  router.post('/logs', async (req, res) => {
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : null;
    if (!entries) {
      res.status(400).json({ error: 'entries must be an array' });
      return;
    }

    let accepted = 0;
    for (const entry of entries) {
      if (typeof entry?.id !== 'string' || typeof entry?.action !== 'string' || !entry?.occurredAt) {
        continue;
      }
      const [result] = await pool.query<import('mysql2').ResultSetHeader>(
        `INSERT IGNORE INTO client_log (id, professional_id, device_id, occurred_at, level, action, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          req.professional!.id,
          String(entry.deviceId ?? 'unknown'),
          new Date(entry.occurredAt),
          String(entry.level ?? 'INFO').slice(0, 10),
          entry.action.slice(0, 100),
          entry.details == null ? null : String(entry.details),
        ],
      );
      accepted += result.affectedRows;
    }
    res.status(201).json({ received: entries.length, accepted });
  });

  router.get('/logs/client', requireAdmin, async (req, res) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT l.*, p.full_name AS professional_name
         FROM client_log l LEFT JOIN professional p ON p.id = l.professional_id
        ORDER BY l.occurred_at DESC LIMIT ?`,
      [clampLimit(req.query.limit)],
    );
    res.json(
      rows.map((row) => ({
        id: row.id,
        professionalId: row.professional_id,
        professionalName: row.professional_name,
        deviceId: row.device_id,
        occurredAt: row.occurred_at,
        level: row.level,
        action: row.action,
        details: row.details,
        receivedAt: row.received_at,
      })),
    );
  });

  router.get('/logs/access', requireAdmin, async (req, res) => {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM access_log ORDER BY id DESC LIMIT ?', [
      clampLimit(req.query.limit),
    ]);
    res.json(
      rows.map((row) => ({
        occurredAt: row.occurred_at,
        clientIp: row.client_ip,
        professionalId: row.professional_id,
        method: row.method,
        route: row.route,
        statusCode: row.status_code,
        durationMs: row.duration_ms,
      })),
    );
  });

  return router;
}
