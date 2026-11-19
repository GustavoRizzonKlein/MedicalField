# MedicalField

Offline-first emergency medical record for pre-hospital care. Final project of
*4815206 - Arquiteturas de Software* (Univates, 2026/B).

| Folder | What | Language |
|---|---|---|
| [`clinical-service`](clinical-service) | Persons, medical records, encounters, medications, sync | Java 21 / Spring Boot |
| [`identity-service`](identity-service) | Login (JWT RS256), professionals, access and offline logs | TypeScript / Node.js |
| [`document-service`](document-service) | Care report PDF and e-mail | Python / FastAPI |
| [`portal`](portal) | Administrative GUI | TypeScript / React |
| [`client`](client) | Responder GUI, offline with SQLite and connectivity simulator | TypeScript / Electron + React |

Documentation for the presentation:

- [Architecture, technologies and design patterns](docs/ARCHITECTURE.md)
- [API reference](docs/API.md) and [Postman collection](postman/MedicalField.postman_collection.json)
- [Database model](docs/DATABASE.md)
- [Test script (roteiro de testes)](docs/TEST-SCRIPT.md)
- [Deploying on the VM](deploy/README.md)

## Running locally (Windows)

Requirements: JDK 21 (`JAVA_HOME` set), Node.js 24, Python 3.12, MySQL 8.4.

1. Create the databases and the application user (once):

   ```bash
   mysql -u root -p -e "source C:/dev/MedicalField/database/setup-local.sql"
   ```

2. Install dependencies (once):

   ```bash
   cd identity-service && npm install && cd ..
   cd portal && npm install && cd ..
   cd client && npm install && cd ..
   cd document-service && python -m venv .venv && .venv\Scripts\pip install -r requirements.txt && cd ..
   ```

3. Start the services and the portal (four windows):

   ```bash
   powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1
   ```

   Start the identity service first on the first run: it creates the JWT keys in `keys/`.

4. Open the portal at http://localhost:5173 and start the client:

   ```bash
   cd client && npm start
   ```

Each service reads an optional `.env` (copy from `.env.example`); the defaults work locally.
Demo users and their password are described in [docs/TEST-SCRIPT.md](docs/TEST-SCRIPT.md).
By default e-mails are written as `.eml` files to `document-service/outbox`; set `EMAIL_MODE=smtp`
to send real e-mails (see [deploy/README.md](deploy/README.md#e-mail-step-17)).

## Checks

```bash
node scripts/smoke-test.mjs
```

```bash
cd client && npm run build && node test/offline-flow.test.cjs
```

```bash
cd clinical-service && gradlew.bat test
```
