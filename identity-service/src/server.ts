import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './config.js';
import { migrate } from './db.js';
import { loadOrCreateKeys } from './keys.js';
import { accessLog, authenticate } from './middleware.js';
import { createRoutes } from './routes.js';
import { seedIfEmpty } from './seed.js';

const { privateKey, publicKey } = loadOrCreateKeys();
await migrate();
await seedIfEmpty();

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

// Chain of Responsibility: each middleware handles one concern and passes the request on.
app.use(accessLog);
app.use(authenticate(publicKey, ['POST /auth/login']));
app.use(createRoutes(privateKey));

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`[identity] listening on http://localhost:${config.port}`);
});
