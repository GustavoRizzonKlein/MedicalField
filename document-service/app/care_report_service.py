import re
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import make_msgid

from . import clinical_client, config, db
from .email_sender import EmailSender
from .pdf_renderer import PdfRenderer
from .security import AuthenticatedProfessional

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class InvalidRecipient(Exception):
    pass


class CareReportService:
    """Facade: one entry point that combines the clinical data, the PDF and the e-mail."""

    def __init__(self, renderer: PdfRenderer, email_sender: EmailSender):
        self._renderer = renderer
        self._email_sender = email_sender

    def build_pdf(self, encounter_id: str, professional: AuthenticatedProfessional) -> tuple[bytes, dict]:
        data = clinical_client.fetch_care_report_data(encounter_id, professional.token)
        return self._renderer.render_care_report(data), data

    def send_by_email(self, encounter_id: str, recipient: str, professional: AuthenticatedProfessional) -> dict:
        recipient = (recipient or "").strip()
        if not EMAIL_PATTERN.match(recipient):
            raise InvalidRecipient("A valid recipient e-mail is required")

        pdf, data = self.build_pdf(encounter_id, professional)
        patient = data["person"].get("fullName", "paciente")

        message = EmailMessage()
        message["Subject"] = f"Ficha de atendimento - {patient}"
        message["From"] = config.EMAIL_FROM
        message["To"] = recipient
        message["Message-ID"] = make_msgid(domain="medicalfield.local")
        message.set_content(
            f"Olá,\n\nSegue em anexo a ficha do atendimento pré-hospitalar de {patient}.\n"
            f"Profissional responsável: {professional.name}.\n\n"
            "Este documento contém dados de saúde. Não o encaminhe a terceiros.\n\nMedicalField"
        )
        message.add_attachment(pdf, maintype="application", subtype="pdf", filename=f"ficha-atendimento-{encounter_id[:8]}.pdf")

        sent_at = datetime.now(timezone.utc)
        status, error = "SENT", None
        try:
            self._email_sender.send(message)
        except Exception as exc:  # recorded in the audit table, then reported to the caller
            status, error = "FAILED", str(exc)

        with db.connection() as conn, conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO email_log (encounter_id, recipient, professional_id, status, error, sent_at)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (encounter_id, recipient, professional.id, status, error, sent_at.replace(tzinfo=None)),
            )
        return {
            "encounterId": encounter_id,
            "recipient": recipient,
            "status": status,
            "error": error,
            "mode": config.EMAIL_MODE,
            "sentAt": sent_at.isoformat(),
        }
