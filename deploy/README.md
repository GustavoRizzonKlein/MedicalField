# Deploying on the Univates VM (no containers)

Assumes a Linux VM (Ubuntu/Debian) with systemd. Adjust paths if the VM is different.

## 1. Install runtimes

```bash
sudo apt update
sudo apt install -y openjdk-21-jdk python3 python3-venv mysql-server git
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && sudo apt install -y nodejs
```

## 2. Get the code and create the databases

```bash
sudo mkdir -p /opt/medicalfield && sudo chown "$USER" /opt/medicalfield
git clone https://github.com/GustavoRizzonKlein/MedicalField.git /opt/medicalfield
```

Edit `database/setup-local.sql` and **change the password** before running it:

```bash
sudo mysql < /opt/medicalfield/database/setup-local.sql
```

## 3. Configure each service

Copy each `.env.example` to `.env` and set `DB_PASSWORD` (and the SMTP values in `document-service/.env`).
For the Java service, the same variables go in its systemd unit (`DB_PASSWORD`, `JWT_PUBLIC_KEY_PATH`).

```bash
cd /opt/medicalfield/identity-service && cp .env.example .env && npm ci
cd /opt/medicalfield/document-service && cp .env.example .env && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cd /opt/medicalfield/clinical-service && ./gradlew bootJar
cd /opt/medicalfield/portal && npm ci && npm run build
```

### E-mail (step 17)

In `document-service/.env` set `EMAIL_MODE=smtp` and an SMTP account. With Gmail: enable 2-step
verification, create an *app password* and use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`,
`SMTP_USER=<account>`, `SMTP_PASSWORD=<app password>`, `EMAIL_FROM=<account>`.
Check early that the VM allows outbound connections on port 587.

## 4. systemd units

Copy the files from `deploy/systemd/` to `/etc/systemd/system/`, adjust `User` and passwords, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now medicalfield-identity medicalfield-clinical medicalfield-documents medicalfield-portal
sudo systemctl status medicalfield-*
```

Start order matters only the first time: the identity service creates `keys/jwt-*.pem`, which the
other two services read.

## 5. Ports

| Service | Port |
|---|---|
| Portal (`vite preview`, proxies `/api/*`) | 4173 |
| identity-service | 8081 |
| clinical-service | 8080 |
| document-service | 8082 |

Open 4173 for the browser, and 8080/8081 for the client app (it calls the services directly).
In the client login screen, use **Configurar servidores** to point to the VM address.
