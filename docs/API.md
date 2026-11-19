# MedicalField - API reference

All routes require `Authorization: Bearer <token>` except `POST /auth/login`.
Errors always return JSON `{"error": "..."}` (or an operation result with `outcome: REJECTED`).
A Postman collection is available in [`postman/MedicalField.postman_collection.json`](../postman/MedicalField.postman_collection.json).

## Mapping to the routes suggested in the spec

| Spec | Implemented | Service |
|---|---|---|
| `POST /auth/login` | `POST /auth/login` | identity :8081 |
| `GET /medicamento` | `GET /medications` | clinical :8080 |
| `GET /prontuario` | `GET /medical-records` | clinical |
| `GET /prontuario/{id}` | `GET /medical-records/{id}` and `GET /persons/{personId}/medical-record` | clinical |
| `POST /pessoa` | `POST /persons` | clinical |
| `GET /atendimento/{id}` (encounters of a person) | `GET /persons/{personId}/encounters` | clinical |
| `POST /prontuario` | `POST /medical-records` | clinical |
| `POST /atendimento` | `POST /encounters` | clinical |
| `POST /log` | `POST /logs` | identity |
| PDF generation | `GET /care-reports/{encounterId}/pdf` | documents :8082 |
| E-mail sending | `POST /care-reports/{encounterId}/email` | documents |

## identity-service (Node.js, port 8081)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | No | Body `{ "registryNumber", "password" }`. Returns `{ token, expiresAt, professional }`. 401 on invalid credentials |
| GET | `/auth/me` | Yes | Authenticated professional |
| GET | `/professionals` | Yes | Professionals (support registry) |
| POST | `/logs` | Yes | Offline client logs. Body `{ "entries": [{ id, occurredAt, level, action, details, deviceId }] }`. Entries already received are ignored. Returns `{ received, accepted }` |
| GET | `/logs/client?limit=` | Admin | Client logs received |
| GET | `/logs/access?limit=` | Admin | Access log of this service |

Token claims: `sub` (professional id), `name`, `registryType` (`CRM`, `COREN`, `RESPONDER`),
`registryNumber`, `role` (`ADMIN`, `RESPONDER`), `iss` = `medicalfield-identity`, `exp`.

## clinical-service (Java, port 8080)

| Method | Route | Description |
|---|---|---|
| GET | `/medications` | All medications |
| GET | `/medications/{id}` | One medication (404 if missing) |
| GET | `/persons` | All persons |
| GET | `/persons/{id}` | One person |
| POST | `/persons` | Create/update a person (upsert by client id) |
| GET | `/persons/{id}/medical-record` | Medical record of a person |
| GET | `/persons/{id}/encounters` | Encounters of a person |
| GET | `/medical-records` | All medical records, with person name |
| GET | `/medical-records/{id}` | One medical record |
| POST | `/medical-records` | Create/update a medical record |
| GET | `/encounters` | All encounters (newest first), with person name and medications |
| GET | `/encounters/{id}` | One encounter |
| POST | `/encounters` | Register an encounter (append-only) |
| GET | `/sync/pull` | Server state for the client: `{ serverTime, medications, persons, medicalRecords, encounters }` |
| POST | `/sync/push` | Client Outbox, see below |
| GET | `/access-logs?limit=` | Access log (admin only) |

### Write routes and idempotency

`POST /persons`, `/medical-records` and `/encounters` accept an optional `Idempotency-Key` header.
Sending the same key twice applies the change once. They answer an operation result:

```json
{ "operationId": "…", "type": "PERSON_UPSERT", "entityId": "…", "outcome": "CREATED", "message": null }
```

| Outcome | HTTP | Meaning |
|---|---|---|
| `CREATED` | 201 | New record |
| `UPDATED` | 200 | Incoming version applied (newer) |
| `KEPT_SERVER_VERSION` | 200 | Server version is newer and was kept (conflict strategy) |
| `DUPLICATE` | 200 | Operation or encounter already processed |
| `REJECTED` | 422 | Business rule broken (`message` explains), e.g. dose above the maximum |

### `POST /sync/push`

```json
{
  "deviceId": "device-1a2b3c4d",
  "operations": [
    { "operationId": "uuid", "type": "PERSON_UPSERT", "person": { "id": "uuid", "fullName": "Maria", "updatedAt": "2026-11-19T13:00:00Z" } },
    { "operationId": "uuid", "type": "MEDICAL_RECORD_UPSERT", "medicalRecord": { "id": "uuid", "personId": "uuid", "allergies": "Latex" } },
    { "operationId": "uuid", "type": "ENCOUNTER_CREATE", "encounter": { "id": "uuid", "medicalRecordId": "uuid", "…": "…" } }
  ]
}
```

Operations are applied in order, each in its own transaction. Response: `{ serverTime, results: [operation result…] }`.

### Encounter body

```json
{
  "id": "uuid",
  "medicalRecordId": "uuid",
  "occurredAt": "2026-11-19T13:00:00Z",
  "location": "BR-386 km 350",
  "chiefComplaint": "Chest pain",
  "systolicBp": 140, "diastolicBp": 90, "heartRate": 110, "respiratoryRate": 22,
  "oxygenSaturation": 94, "temperature": 36.8, "bloodGlucose": 120,
  "glasgowEye": 4, "glasgowVerbal": 5, "glasgowMotor": 6,
  "manchesterPriority": "ORANGE",
  "startCategory": "YELLOW",
  "procedures": "IV access", "destination": "Hospital", "notes": null,
  "medications": [ { "id": "uuid", "medicationId": "uuid", "dose": 200, "route": "VO", "administeredAt": "2026-11-19T13:05:00Z" } ]
}
```

Validation: Glasgow eye 1-4, verbal 1-5, motor 1-6; Manchester `RED|ORANGE|YELLOW|GREEN|BLUE`;
START `RED|YELLOW|GREEN|BLACK` (optional); SpO2 0-100; each dose > 0 and ≤ `medication.maximumDose`.
The professional is taken from the token, never from the body.

## document-service (Python, port 8082)

| Method | Route | Description |
|---|---|---|
| GET | `/care-reports/{encounterId}/pdf` | Care report PDF (`application/pdf`, download) |
| POST | `/care-reports/{encounterId}/email` | Body `{ "to": "family@example.com" }`. Sends the PDF attached. 201 when sent, 502 when delivery failed, 422 for invalid address |
| GET | `/care-reports/emails?limit=` | E-mails sent (audit) |

The service fetches the encounter, medical record and person from the clinical service, forwarding the caller's token.

## Access log (all services)

Each request is stored in the `access_log` table of the service and printed to the console with:
date/time, client IP, authenticated professional id, HTTP method, route, status code and processing time (ms).
