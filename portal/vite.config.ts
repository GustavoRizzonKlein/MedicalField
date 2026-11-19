import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The portal calls /api/<service>/...; Vite forwards each prefix to its service.
// Same origin for the browser, so no CORS setup is needed in the services.
// On the VM, set the *_URL variables if the services are not on localhost.
const services = {
  '/api/identity': process.env.IDENTITY_URL ?? 'http://localhost:8081',
  '/api/clinical': process.env.CLINICAL_URL ?? 'http://localhost:8080',
  '/api/documents': process.env.DOCUMENTS_URL ?? 'http://localhost:8082',
};

const proxy = Object.fromEntries(
  Object.entries(services).map(([prefix, target]) => [
    prefix,
    { target, changeOrigin: true, rewrite: (path: string) => path.slice(prefix.length) },
  ]),
);

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, host: true, proxy },
});
