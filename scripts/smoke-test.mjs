// End-to-end check of the three services through their HTTP APIs.
// Usage (services running):  node scripts/smoke-test.mjs
// Optional env: IDENTITY_URL, CLINICAL_URL, DOCUMENTS_URL, SMOKE_USER, SEED_PASSWORD
import { randomUUID } from 'node:crypto';

const IDENTITY = process.env.IDENTITY_URL ?? 'http://localhost:8081';
const CLINICAL = process.env.CLINICAL_URL ?? 'http://localhost:8080';
const DOCUMENTS = process.env.DOCUMENTS_URL ?? 'http://localhost:8082';
const USER = process.env.SMOKE_USER ?? 'CRM-RS-12345';
const PASSWORD = process.env.SEED_PASSWORD ?? 'MedicalField@2026';

let failures = 0;
function check(name, condition, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${condition || !detail ? '' : `  -> ${detail}`}`);
  if (!condition) failures++;
}

async function call(base, path, { token, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = response.headers.get('content-type') ?? '';
  const data = type.includes('json') ? await response.json() : await response.arrayBuffer();
  return { status: response.status, data, type };
}

// 1. Authentication
const noToken = await call(CLINICAL, '/medications');
check('clinical rejects request without token', noToken.status === 401, noToken.status);
const badLogin = await call(IDENTITY, '/auth/login', { method: 'POST', body: { registryNumber: USER, password: 'wrong' } });
check('login rejects wrong password', badLogin.status === 401, badLogin.status);
const login = await call(IDENTITY, '/auth/login', { method: 'POST', body: { registryNumber: USER, password: PASSWORD } });
check('login returns a token', login.status === 200 && typeof login.data.token === 'string', JSON.stringify(login.data));
const token = login.data.token;
for (const [name, base, path] of [['identity', IDENTITY, '/auth/me'], ['documents', DOCUMENTS, '/care-reports/emails']]) {
  const result = await call(base, path, { token });
  check(`${name} accepts the token`, result.status === 200, result.status);
}

// 2. Pull (client receives data)
const pull = await call(CLINICAL, '/sync/pull', { token });
check('pull returns medications', pull.status === 200 && pull.data.medications.length > 0, pull.status);
const aas = pull.data.medications.find((m) => m.name.startsWith('Acetylsalicylic'));
check('seeded medication with maximum dose exists', aas && Number(aas.maximumDose) === 300);

// 3. Push an offline occurrence: person -> medical record -> encounter, in order
const now = new Date().toISOString();
const personId = randomUUID();
const recordId = randomUUID();
const encounterId = randomUUID();
const operations = [
  { operationId: randomUUID(), type: 'PERSON_UPSERT', person: { id: personId, fullName: 'Smoke Test Patient', birthDate: '1985-03-10', sex: 'Feminino', email: 'family@example.com', createdAt: now, updatedAt: now } },
  { operationId: randomUUID(), type: 'MEDICAL_RECORD_UPSERT', medicalRecord: { id: recordId, personId, bloodType: 'A+', allergies: 'Dipirona', createdAt: now, updatedAt: now } },
  {
    operationId: randomUUID(),
    type: 'ENCOUNTER_CREATE',
    encounter: {
      id: encounterId, medicalRecordId: recordId, occurredAt: now, location: 'BR-386 km 350', chiefComplaint: 'Dor torácica',
      systolicBp: 140, diastolicBp: 90, heartRate: 110, respiratoryRate: 22, oxygenSaturation: 94, temperature: 36.8,
      glasgowEye: 4, glasgowVerbal: 5, glasgowMotor: 6, manchesterPriority: 'ORANGE', startCategory: 'YELLOW',
      medications: [{ id: randomUUID(), medicationId: aas.id, dose: 200, route: 'VO', administeredAt: now }],
    },
  },
];
const push = await call(CLINICAL, '/sync/push', { token, method: 'POST', body: { deviceId: 'smoke-test', operations } });
check('push creates person, record and encounter', push.status === 200 && push.data.results.every((r) => r.outcome === 'CREATED'), JSON.stringify(push.data.results));

// 4. Idempotency: resending the same batch changes nothing
const again = await call(CLINICAL, '/sync/push', { token, method: 'POST', body: { deviceId: 'smoke-test', operations } });
check('resent batch is reported as DUPLICATE', again.data.results.every((r) => r.outcome === 'DUPLICATE'), JSON.stringify(again.data.results));

// 5. Clinical safety: dose above the maximum is rejected
const overdose = await call(CLINICAL, '/encounters', {
  token, method: 'POST',
  body: { ...operations[2].encounter, id: randomUUID(), medications: [{ medicationId: aas.id, dose: 900, administeredAt: now }] },
});
check('dose above maximum is rejected with 422', overdose.status === 422 && /exceeds the maximum/.test(overdose.data.message), JSON.stringify(overdose.data));

// 6. Conflict (last-write-wins): an older version does not overwrite a newer one
const older = new Date(Date.now() - 60_000).toISOString();
const newer = new Date(Date.now() + 60_000).toISOString();
const stale = await call(CLINICAL, '/persons', { token, method: 'POST', body: { id: personId, fullName: 'Stale Name', updatedAt: older } });
check('older version keeps the server data', stale.data.outcome === 'KEPT_SERVER_VERSION', JSON.stringify(stale.data));
const fresh = await call(CLINICAL, '/persons', { token, method: 'POST', body: { id: personId, fullName: 'Smoke Test Patient Updated', updatedAt: newer } });
check('newer version updates the person', fresh.data.outcome === 'UPDATED', JSON.stringify(fresh.data));

// 7. Queries used by the portal and the spec routes
const encounters = await call(CLINICAL, `/persons/${personId}/encounters`, { token });
check('encounters of a person include the new one', encounters.data.some?.((e) => e.id === encounterId && e.glasgowTotal === 15), encounters.status);
const record = await call(CLINICAL, `/medical-records/${recordId}`, { token });
check('medical record shows the person name', record.data.personName === 'Smoke Test Patient Updated', JSON.stringify(record.data));

// 8. Care report PDF and e-mail
const pdf = await call(DOCUMENTS, `/care-reports/${encounterId}/pdf`, { token });
const pdfHeader = pdf.data instanceof ArrayBuffer ? Buffer.from(pdf.data).subarray(0, 5).toString() : '';
check('care report PDF is generated', pdf.status === 200 && pdfHeader === '%PDF-', `${pdf.status} ${pdf.type}`);
const email = await call(DOCUMENTS, `/care-reports/${encounterId}/email`, { token, method: 'POST', body: { to: 'family@example.com' } });
check('care report is e-mailed', email.status === 201 && email.data.status === 'SENT', JSON.stringify(email.data));

// 9. Offline client logs and access logs
const logs = await call(IDENTITY, '/logs', {
  token, method: 'POST',
  body: { entries: [{ id: randomUUID(), occurredAt: now, level: 'INFO', action: 'ENCOUNTER_SAVED_OFFLINE', deviceId: 'smoke-test', details: encounterId }] },
});
check('offline client logs are accepted', logs.status === 201 && logs.data.accepted === 1, JSON.stringify(logs.data));
const access = await call(CLINICAL, '/access-logs?limit=5', { token });
check('clinical access log records requests', access.status === 200 && access.data.length > 0 && access.data[0].durationMs !== undefined, access.status);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
