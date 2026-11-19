import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
  // Keeps DATETIME values as written, in UTC.
  timezone: 'Z',
  dateStrings: false,
});

/**
 * Minimal migration runner: applies each file in /migrations once, in name order,
 * and records it in schema_migrations. Same idea as Flyway in the Java service.
 */
export async function migrate(): Promise<void> {
  const connection = await mysql.createConnection({ ...config.db, multipleStatements: true });
  try {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         version VARCHAR(100) PRIMARY KEY,
         applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
       )`,
    );
    const [rows] = await connection.query<mysql.RowDataPacket[]>('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.version as string));

    const dir = join(import.meta.dirname, '..', 'migrations');
    const files = readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      await connection.query(readFileSync(join(dir, file), 'utf8'));
      await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
      console.log(`[migrate] applied ${file}`);
    }
  } finally {
    await connection.end();
  }
}
