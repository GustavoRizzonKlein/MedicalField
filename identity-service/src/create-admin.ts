// Creates (or resets the password of) an administrator, asking for the password in the terminal.
// Usage: npx tsx src/create-admin.ts <registryNumber> "<full name>"
// The password is typed without echo and never passed on the command line.
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from './db.js';

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(new Error('Run this in an interactive terminal (ssh -t).'));
      return;
    }
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

const [registryNumber, fullName = 'Admin'] = process.argv.slice(2);
if (!registryNumber) {
  console.error('Usage: npx tsx src/create-admin.ts <registryNumber> "<full name>"');
  process.exit(1);
}

const password = await readHidden(`Senha para ${registryNumber}: `);
const confirmation = await readHidden('Repita a senha: ');
if (password !== confirmation) {
  console.error('As senhas não conferem. Nada foi alterado.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Use pelo menos 8 caracteres. Nada foi alterado.');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 10);
const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM professional WHERE registry_number = ?', [registryNumber]);
if (rows.length > 0) {
  await pool.query(
    "UPDATE professional SET full_name = ?, role = 'ADMIN', password_hash = ?, active = TRUE WHERE registry_number = ?",
    [fullName, passwordHash, registryNumber],
  );
  console.log(`Administrador ${registryNumber} atualizado.`);
} else {
  await pool.query(
    `INSERT INTO professional (id, full_name, registry_type, registry_number, role, password_hash)
     VALUES (?, ?, 'RESPONDER', ?, 'ADMIN', ?)`,
    [randomUUID(), fullName, registryNumber, passwordHash],
  );
  console.log(`Administrador ${registryNumber} criado.`);
}
await pool.end();
