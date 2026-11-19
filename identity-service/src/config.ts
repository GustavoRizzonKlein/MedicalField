import { existsSync } from 'node:fs';

// Loads .env when present; real environment variables always win.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

function env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number(env('PORT', '8081')),
  db: {
    host: env('DB_HOST', 'localhost'),
    port: Number(env('DB_PORT', '3306')),
    user: env('DB_USER', 'medicalfield'),
    password: env('DB_PASSWORD', 'medicalfield_dev'),
    database: env('DB_NAME', 'medicalfield_identity'),
  },
  jwt: {
    privateKeyPath: env('JWT_PRIVATE_KEY_PATH', '../keys/jwt-private.pem'),
    publicKeyPath: env('JWT_PUBLIC_KEY_PATH', '../keys/jwt-public.pem'),
    issuer: 'medicalfield-identity',
    ttlHours: Number(env('TOKEN_TTL_HOURS', '12')),
  },
  seedPassword: env('SEED_PASSWORD', 'MedicalField@2026'),
};
