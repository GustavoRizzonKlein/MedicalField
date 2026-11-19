import httpx

from . import config


class ClinicalServiceError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


def _get(path: str, token: str) -> dict:
    # The user's own token is forwarded, so the clinical service applies its own auth and access log.
    try:
        response = httpx.get(
            f"{config.CLINICAL_SERVICE_URL}{path}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
    except httpx.HTTPError as error:
        raise ClinicalServiceError(502, f"Clinical service unavailable: {error}") from error

    if response.status_code == 404:
        raise ClinicalServiceError(404, "Encounter not found")
    if response.status_code >= 400:
        raise ClinicalServiceError(502, f"Clinical service answered {response.status_code}")
    return response.json()


def fetch_care_report_data(encounter_id: str, token: str) -> dict:
    """Collects everything the care report shows: encounter, medical record and person."""
    encounter = _get(f"/encounters/{encounter_id}", token)
    medical_record = _get(f"/medical-records/{encounter['medicalRecordId']}", token)
    person = _get(f"/persons/{medical_record['personId']}", token)
    return {"encounter": encounter, "medicalRecord": medical_record, "person": person}
