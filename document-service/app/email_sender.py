import smtplib
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from email.message import EmailMessage

from . import config


class EmailSender(ABC):
    """Adapter interface: the care report service sends e-mail without knowing how it is delivered."""

    @abstractmethod
    def send(self, message: EmailMessage) -> None: ...


class SmtpEmailSender(EmailSender):
    """Real delivery through an SMTP server (for example Gmail with an app password)."""

    def send(self, message: EmailMessage) -> None:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=20) as smtp:
            if config.SMTP_STARTTLS:
                smtp.starttls()
            if config.SMTP_USER:
                smtp.login(config.SMTP_USER, config.SMTP_PASSWORD)
            smtp.send_message(message)


class FileEmailSender(EmailSender):
    """Development delivery: saves the e-mail as an .eml file that opens in any mail client."""

    def send(self, message: EmailMessage) -> None:
        config.EMAIL_OUTBOX_DIR.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
        (config.EMAIL_OUTBOX_DIR / f"{stamp}.eml").write_bytes(message.as_bytes())


def create_email_sender() -> EmailSender:
    if config.EMAIL_MODE == "smtp":
        return SmtpEmailSender()
    if config.EMAIL_MODE == "file":
        return FileEmailSender()
    raise ValueError(f"Unknown EMAIL_MODE: {config.EMAIL_MODE}")
