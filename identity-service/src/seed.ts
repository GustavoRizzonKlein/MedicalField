import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { RowDataPacket } from 'mysql2/promise';
import { config } from './config.js';
import { pool } from './db.js';

// Demo professionals for local tests and the classroom presentation.
// All of them use SEED_PASSWORD (see .env.example).
const demoProfessionals = [
  { fullName: 'Ana Souza', registryType: 'CRM', registryNumber: 'CRM-RS-12345', role: 'ADMIN' },
  { fullName: 'Bruno Lima', registryType: 'COREN', registryNumber: 'COREN-RS-54321', role: 'RESPONDER' },
  { fullName: 'Carla Mendes', registryType: 'RESPONDER', registryNumber: 'SOC-0001', role: 'RESPONDER' },
];

export async function seedIfEmpty(): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM professional');
  if (Number(rows[0].total) > 0) return;

  const passwordHash = await bcrypt.hash(config.seedPassword, 10);
  for (const professional of demoProfessionals) {
    await pool.query(
      `INSERT INTO professional (id, full_name, registry_type, registry_number, role, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), professional.fullName, professional.registryType, professional.registryNumber, professional.role, passwordHash],
    );
  }
  console.log(`[seed] created ${demoProfessionals.length} demo professionals`);
}
