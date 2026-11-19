import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';

/**
 * Tokens are signed with RS256: this service keeps the private key, and the Java and
 * Python services verify tokens with the public key alone, so they can never issue one.
 */
export function loadOrCreateKeys(): { privateKey: string; publicKey: string } {
  const { privateKeyPath, publicKeyPath } = config.jwt;

  if (!existsSync(privateKeyPath) || !existsSync(publicKeyPath)) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    mkdirSync(dirname(privateKeyPath), { recursive: true });
    mkdirSync(dirname(publicKeyPath), { recursive: true });
    writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
    writeFileSync(publicKeyPath, publicKey);
    console.log(`[keys] generated a new RSA key pair in ${dirname(publicKeyPath)}`);
  }

  return {
    privateKey: readFileSync(privateKeyPath, 'utf8'),
    publicKey: readFileSync(publicKeyPath, 'utf8'),
  };
}
