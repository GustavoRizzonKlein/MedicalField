#!/usr/bin/env bash
# Switches the document service to real e-mail delivery through Gmail (or another SMTP server).
# Asks for the account and the app password interactively; the password is not echoed nor kept in history.
# Usage on the VM:  bash /opt/medicalfield/deploy/configure-smtp.sh
set -euo pipefail

ENV_FILE=/opt/medicalfield/document-service/.env

# Interactive on the VM, or fed by deploy/configure-smtp.ps1 from Windows (two lines on stdin).
read -r -p "Conta Gmail que vai enviar (ex.: medicalfield.demo@gmail.com): " SMTP_USER || true
read -r -s -p "Senha de app do Gmail (16 letras, sem mostrar): " SMTP_PASSWORD || true
echo
SMTP_USER="${SMTP_USER//[$'\r\t ']/}"
SMTP_PASSWORD="${SMTP_PASSWORD//[$'\r\t ']/}"   # Gmail shows the app password in groups of 4 letters

if [[ -z "$SMTP_USER" || -z "$SMTP_PASSWORD" ]]; then
  echo "Conta e senha são obrigatórias. Nada foi alterado."
  exit 1
fi

# Rewrites only the e-mail keys of the .env, keeping everything else.
SMTP_USER="$SMTP_USER" SMTP_PASSWORD="$SMTP_PASSWORD" python3 - "$ENV_FILE" <<'PY'
import os, sys
path = sys.argv[1]
values = {
    "EMAIL_MODE": "smtp",
    "SMTP_HOST": "smtp.gmail.com",
    "SMTP_PORT": "587",
    "SMTP_STARTTLS": "true",
    "SMTP_USER": os.environ["SMTP_USER"],
    "SMTP_PASSWORD": os.environ["SMTP_PASSWORD"],
    "EMAIL_FROM": f"MedicalField <{os.environ['SMTP_USER']}>",
}
lines, seen = [], set()
for line in open(path, encoding="utf-8").read().splitlines():
    key = line.split("=", 1)[0].strip()
    if key in values and not line.lstrip().startswith("#"):
        lines.append(f"{key}={values[key]}")
        seen.add(key)
    else:
        lines.append(line)
lines += [f"{k}={v}" for k, v in values.items() if k not in seen]
open(path, "w", encoding="utf-8").write("\n".join(lines) + "\n")
PY
chmod 600 "$ENV_FILE"

# Checks the login before restarting, so a wrong password is reported here and not during the presentation.
cd /opt/medicalfield/document-service
if .venv/bin/python - <<'PY'
import smtplib, sys
sys.path.insert(0, ".")
from app import config
try:
    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=20) as smtp:
        smtp.starttls()
        smtp.ehlo()
        # Only AUTH PLAIN: smtplib.login() would fall back to AUTH LOGIN after a 535, and Gmail then just
        # drops the connection, hiding the real reason.
        smtp.user, smtp.password = config.SMTP_USER, config.SMTP_PASSWORD
        smtp.auth("PLAIN", smtp.auth_plain)
except smtplib.SMTPAuthenticationError as error:
    print(f"O Gmail recusou conta/senha ({error.smtp_code}). Use a SENHA DE APP de 16 letras, não a senha normal.")
    sys.exit(1)
except (smtplib.SMTPException, OSError) as error:
    print(f"Falha ao falar com o Gmail: {type(error).__name__}: {error}")
    sys.exit(1)
print("Login no Gmail OK.")
PY
then
  sudo systemctl restart medicalfield-documents
  echo "E-mail real ativado. O serviço de documentos foi reiniciado."
else
  echo "O .env foi gravado, mas o serviço NÃO foi reiniciado. Rode o script de novo com a senha certa."
  exit 1
fi
