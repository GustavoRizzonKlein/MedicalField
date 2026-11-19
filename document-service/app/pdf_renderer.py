from datetime import date, datetime, timedelta, timezone

from fpdf import FPDF

# Brazil (Brasilia time) has no daylight saving time since 2019.
BRASILIA = timezone(timedelta(hours=-3), "BRT")

MANCHESTER = {
    "RED": "Vermelho - emergência",
    "ORANGE": "Laranja - muito urgente",
    "YELLOW": "Amarelo - urgente",
    "GREEN": "Verde - pouco urgente",
    "BLUE": "Azul - não urgente",
}
START = {
    "RED": "Vermelho - imediato",
    "YELLOW": "Amarelo - tardio",
    "GREEN": "Verde - leve",
    "BLACK": "Preto - expectante/óbito",
}


def _text(value) -> str:
    """Core PDF fonts only cover Latin-1, which includes Portuguese accents."""
    if value is None or value == "":
        return "-"
    return str(value).encode("latin-1", "replace").decode("latin-1")


def _datetime(value: str | None) -> str:
    if not value:
        return "-"
    moment = datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(BRASILIA)
    return moment.strftime("%d/%m/%Y %H:%M")


def _date(value: str | None) -> str:
    return date.fromisoformat(value).strftime("%d/%m/%Y") if value else "-"


class PdfRenderer:
    """Adapter over the fpdf2 library: the rest of the service never touches fpdf2 directly."""

    def render_care_report(self, data: dict) -> bytes:
        encounter, record, person = data["encounter"], data["medicalRecord"], data["person"]
        pdf = _CareReportPdf()
        pdf.add_page()

        pdf.section("Paciente")
        pdf.field("Nome", person.get("fullName"))
        pdf.field("Nascimento", _date(person.get("birthDate")))
        pdf.field("Sexo", person.get("sex"))
        pdf.field("Documento", person.get("documentNumber"))
        pdf.field("Telefone", person.get("phone"))

        pdf.section("Prontuário")
        pdf.field("Tipo sanguíneo", record.get("bloodType"))
        pdf.field("Alergias", record.get("allergies"))
        pdf.field("Condições crônicas", record.get("chronicConditions"))
        pdf.field("Medicamentos contínuos", record.get("continuousMedications"))

        pdf.section("Atendimento")
        pdf.field("Data/hora", _datetime(encounter.get("occurredAt")))
        pdf.field("Local", encounter.get("location"))
        pdf.field("Profissional", encounter.get("professionalName"))
        pdf.field("Queixa principal", encounter.get("chiefComplaint"))
        pdf.field("Destino", encounter.get("destination"))

        pdf.section("Sinais vitais")
        systolic, diastolic = encounter.get("systolicBp"), encounter.get("diastolicBp")
        pdf.field("Pressão arterial", f"{systolic}/{diastolic} mmHg" if systolic and diastolic else None)
        pdf.field("Frequência cardíaca", _unit(encounter.get("heartRate"), "bpm"))
        pdf.field("Frequência respiratória", _unit(encounter.get("respiratoryRate"), "irpm"))
        pdf.field("Saturação de O2", _unit(encounter.get("oxygenSaturation"), "%"))
        pdf.field("Temperatura", _unit(encounter.get("temperature"), "°C"))
        pdf.field("Glicemia", _unit(encounter.get("bloodGlucose"), "mg/dL"))

        pdf.section("Avaliação e triagem")
        pdf.field(
            "Escala de Glasgow",
            f"{encounter.get('glasgowTotal')} (O{encounter.get('glasgowEye')} "
            f"V{encounter.get('glasgowVerbal')} M{encounter.get('glasgowMotor')})",
        )
        pdf.field("Manchester", MANCHESTER.get(encounter.get("manchesterPriority"), encounter.get("manchesterPriority")))
        pdf.field("START", START.get(encounter.get("startCategory"), encounter.get("startCategory")))
        pdf.field("Procedimentos", encounter.get("procedures"))
        pdf.field("Observações", encounter.get("notes"))

        pdf.section("Medicamentos administrados")
        medications = encounter.get("medications") or []
        if not medications:
            pdf.paragraph("Nenhum medicamento administrado.")
        for item in medications:
            pdf.paragraph(
                f"- {item.get('medicationName')}: {item.get('dose')} {item.get('unit') or ''}"
                f" | via {item.get('route') or '-'} | {_datetime(item.get('administeredAt'))}"
            )

        return bytes(pdf.output())


def _unit(value, unit: str) -> str | None:
    return f"{value} {unit}" if value is not None else None


class _CareReportPdf(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 15)
        self.cell(0, 9, _text("MedicalField - Ficha de Atendimento"), new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 9)
        self.cell(0, 5, _text("Atendimento pré-hospitalar"), new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        generated = datetime.now(BRASILIA).strftime("%d/%m/%Y %H:%M")
        self.cell(0, 8, _text(f"Gerado em {generated} - página {self.page_no()}"), align="C")

    def section(self, title: str):
        self.ln(2)
        self.set_font("Helvetica", "B", 11)
        self.set_fill_color(230, 236, 245)
        self.cell(0, 7, _text(title), fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def field(self, label: str, value):
        self.set_font("Helvetica", "B", 9)
        self.cell(50, 6, _text(label))
        self.set_font("Helvetica", "", 9)
        self.multi_cell(0, 6, _text(value), new_x="LMARGIN", new_y="NEXT")

    def paragraph(self, text: str):
        self.set_font("Helvetica", "", 9)
        self.multi_cell(0, 6, _text(text), new_x="LMARGIN", new_y="NEXT")
