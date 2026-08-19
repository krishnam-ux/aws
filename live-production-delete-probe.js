const fs = require('fs');
const path = require('path');

function loadEnvFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnvFile(path.join(process.cwd(), '.env.production.local'));
const DATABASE_URL = env.DATABASE_URL;
const baseUrl = 'https://www.awssbgcuup.tech';

function postJson(url, payload, headers = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload)
  }).then(async (res) => {
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return { status: res.status, ok: res.ok, data };
  });
}

async function main() {
  const unique = Date.now();
  const synthetic = {
    eventId: 'event-01',
    fullName: `LIVE DELETE TEST ${unique}`,
    email: `live.delete.test.${unique}@example.com`,
    phone: '+91 98765 43210',
    university: 'Chandigarh University – Uttar Pradesh',
    program: 'B.Tech CSE',
    year: '2nd Year',
    studentId: `LIVE-DELETE-${unique}`,
    interests: ['Cloud', 'AI'],
    experienceLevel: 'Beginner',
    linkedin: '',
    github: '',
    motivation: 'Synthetic production verification row for delete bug investigation.',
    consent: true
  };

  const createRes = await postJson(`${baseUrl}/api/event-register`, synthetic);
  console.log('CREATE_STATUS', createRes.status);
  console.log('CREATE_BODY', JSON.stringify(createRes.data));

  if (!createRes.ok || !createRes.data.registrationId) {
    console.log('CREATE_FAILED');
    return;
  }

  const registrationId = createRes.data.registrationId;

  const sql = require('postgres')(DATABASE_URL, { ssl: 'require', max: 1, idle_timeout: 20, connect_timeout: 30 });
  try {
    const dbRows = await sql`SELECT id, event_id, name, email, status, attendance FROM registrations WHERE id = ${registrationId}`;
    console.log('DB_AFTER_CREATE_COUNT', dbRows.length);
    console.log('DB_AFTER_CREATE_ROW', JSON.stringify(dbRows[0] || null));
  } finally {
    await sql.end();
  }

  const loginRes = await postJson(`${baseUrl}/api/admin`, {
    action: 'login',
    username: 'awsadmin@culko.in',
    password: 'awssbgadmin123'
  });
  console.log('LOGIN_STATUS', loginRes.status);
  const token = loginRes.data && loginRes.data.token ? loginRes.data.token : null;
  console.log('LOGIN_HAS_TOKEN', !!token);

  const statsBeforeDeleteRes = await postJson(`${baseUrl}/api/admin`, { action: 'get-stats' }, { Authorization: `Bearer ${token}` });
  console.log('STATS_BEFORE_DELETE_STATUS', statsBeforeDeleteRes.status);
  console.log('STATS_BEFORE_DELETE', JSON.stringify(statsBeforeDeleteRes.data));

  const deleteRes = await postJson(`${baseUrl}/api/admin`, { action: 'delete-event-registration', id: registrationId }, { Authorization: `Bearer ${token}` });
  console.log('DELETE_STATUS', deleteRes.status);
  console.log('DELETE_BODY', JSON.stringify(deleteRes.data));

  const sql2 = require('postgres')(DATABASE_URL, { ssl: 'require', max: 1, idle_timeout: 20, connect_timeout: 30 });
  try {
    const afterRows = await sql2`SELECT id, event_id, name, email, status, attendance FROM registrations WHERE id = ${registrationId}`;
    console.log('DB_AFTER_DELETE_COUNT', afterRows.length);
    console.log('DB_AFTER_DELETE_ROW', JSON.stringify(afterRows[0] || null));
  } finally {
    await sql2.end();
  }

  const statsAfterDeleteRes = await postJson(`${baseUrl}/api/admin`, { action: 'get-stats' }, { Authorization: `Bearer ${token}` });
  console.log('STATS_AFTER_DELETE_STATUS', statsAfterDeleteRes.status);
  console.log('STATS_AFTER_DELETE', JSON.stringify(statsAfterDeleteRes.data));
}

main().catch((err) => {
  console.error('PROBE_ERROR', err);
  process.exit(1);
});
