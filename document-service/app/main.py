from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Query, Request
from fastapi.responses import JSONResponse, Response
from fastapi.security import HTTPBearer
from pydantic import BaseModel

from . import config, db
from .care_report_service import CareReportService, InvalidRecipient
from .clinical_client import ClinicalServiceError
from .email_sender import create_email_sender
from .middleware import AccessLogMiddleware, AuthenticationMiddleware
from .pdf_renderer import PdfRenderer


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.migrate()
    yield


# Swagger UI at /docs. The token is checked by AuthenticationMiddleware; the HTTPBearer
# dependency only adds the "Authorize" button to the documentation.
app = FastAPI(
    title="MedicalField Document Service",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json",
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)

# Starlette runs the middleware added last first: access log -> authentication -> route.
app.add_middleware(AuthenticationMiddleware)
app.add_middleware(AccessLogMiddleware)

care_reports = CareReportService(PdfRenderer(), create_email_sender())


class EmailRequest(BaseModel):
    to: str


@app.exception_handler(ClinicalServiceError)
async def clinical_error(_request: Request, error: ClinicalServiceError):
    return JSONResponse({"error": str(error)}, status_code=error.status_code)


@app.exception_handler(InvalidRecipient)
async def invalid_recipient(_request: Request, error: InvalidRecipient):
    return JSONResponse({"error": str(error)}, status_code=422)


@app.get("/care-reports/{encounter_id}/pdf")
def download_care_report(encounter_id: str, request: Request):
    pdf, _data = care_reports.build_pdf(encounter_id, request.state.professional)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="ficha-atendimento-{encounter_id[:8]}.pdf"'},
    )


@app.post("/care-reports/{encounter_id}/email")
def email_care_report(encounter_id: str, body: EmailRequest, request: Request):
    result = care_reports.send_by_email(encounter_id, body.to, request.state.professional)
    return JSONResponse(result, status_code=201 if result["status"] == "SENT" else 502)


@app.get("/care-reports/emails")
def list_sent_emails(limit: int = Query(default=100, ge=1, le=500)):
    with db.connection() as conn, conn.cursor() as cursor:
        cursor.execute("SELECT * FROM email_log ORDER BY id DESC LIMIT %s", (limit,))
        rows = cursor.fetchall()
    return [
        {
            "id": row["id"],
            "encounterId": row["encounter_id"],
            "recipient": row["recipient"],
            "professionalId": row["professional_id"],
            "status": row["status"],
            "error": row["error"],
            "sentAt": row["sent_at"].isoformat() + "Z",
        }
        for row in rows
    ]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=config.PORT)
