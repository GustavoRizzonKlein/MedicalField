# MedicalField - Test script (roteiro de testes)

Before starting: all services running (see the README), the Portal open in the browser and the client app open.
Demo users are created on the first start of the identity service; their password is `SEED_PASSWORD`
in `identity-service/.env.example`.

| Registry | Name | Role |
|---|---|---|
| `CRM-RS-12345` | Ana Souza | ADMIN (use in the Portal) |
| `COREN-RS-54321` | Bruno Lima | RESPONDER |
| `SOC-0001` | Carla Mendes | RESPONDER (use in the client) |

| # | Where | Action | Expected result |
|---|---|---|---|
| 1 | Portal | Log in with `CRM-RS-12345` | Encounters tab opens |
| 2 | Portal | Open **Medicamentos** and **Profissionais** | Support registries listed |
| 3 | Portal | Open **Prontuários** | Medical records listed |
| 4 | Portal | Open **Atendimentos** | Encounters listed |
| 5 | Client | Log in with `SOC-0001` (simulator ONLINE) | Main screen with status bar |
| 6 | Client | Click **Receber dados do Portal** | Message with medications, persons and encounters received; **Medicamentos** tab filled |
| 7 | Client | ONLINE: **Nova ocorrência** → choose a patient (or new), fill the encounter, **Registrar ocorrência** | Message "registrada… enviada(s) ao Portal"; **Pendentes: 0** |
| 8 | Portal | **Atendimentos** → **Atualizar** | The encounter from step 7 appears |
| 9 | Database | Insert a medication (SQL below) | Row inserted |
| 10 | Portal | **Medicamentos** → **Atualizar** | New medication listed |
| 11 | Client | **Receber dados do Portal** | New medication available in the client (**Medicamentos** tab and the encounter form) |
| 12 | Client | Switch the simulator to **OFFLINE**. **Nova ocorrência** → **Novo paciente**, fill person, medical record and encounter, **Registrar ocorrência** | "Offline: ficará na fila…"; **Pendentes: 3**; **Pendências** tab shows person, medical record and encounter |
| 13 | Portal | **Prontuários** and **Atendimentos** → **Atualizar** | The new patient is **not** shown |
| 14 | Client | Switch the simulator to **ONLINE** | The Outbox is sent automatically (Observer); **Pendentes: 0**; items show **Sincronizado** |
| 15 | Portal | **Prontuários** and **Atendimentos** → **Atualizar** | The new patient and encounter **are** shown |
| 16 | Portal | **Atendimentos** → click the encounter → **Baixar ficha (PDF)** | PDF downloaded with patient, vitals, Glasgow, triage and medications |
| 17 | Portal | Same panel → type the recipient e-mail → **Enviar por e-mail** | "E-mail enviado…"; the e-mail arrives with the PDF attached; listed in **Auditoria** |

SQL for step 9 (MySQL):

```sql
INSERT INTO medicalfield_clinical.medication (id, name, unit, maximum_dose)
VALUES (UUID(), 'Morphine (Morfina)', 'mg', 10.00);
```

## Extra demonstrations (requirements not covered by the steps above)

| Requirement | How to show it |
|---|---|
| Clinical safety offline | In the client, add a medication with a dose above the maximum: the form shows "Dose bloqueada" and does not save, even offline |
| Idempotency | Postman: send the same `POST /sync/push` body twice (collection item "Push the same batch twice"); the second answer is `DUPLICATE` for every operation |
| Conflict resolution | Postman: `POST /persons` with an older `updatedAt` → `KEPT_SERVER_VERSION`; with a newer one → `UPDATED` |
| Authentication | Any route without a token answers 401 |
| Access logs | Portal → **Auditoria**: access logs of the Java and Node services, offline client logs and e-mails sent. The Python service logs to its console and to `medicalfield_documents.access_log` |
| Offline logs (`POST /logs`) | Actions done offline (step 12) appear in **Auditoria → Logs do cliente** after step 14, with "Ocorrido em" earlier than "Recebido em" |

## Automated checks

With the services running:

```bash
node scripts/smoke-test.mjs
```

```bash
cd client && npm run build && node test/offline-flow.test.cjs
```

The first covers authentication, pull/push, idempotency, dose limit, conflict strategy, PDF, e-mail and logs (18 checks).
The second runs steps 6, 12, 13, 14 and 15 through the client's own logic (13 checks).
