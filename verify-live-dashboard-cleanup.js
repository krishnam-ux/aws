const https = require('https');

function request(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: opts.method || 'GET', headers: opts.headers || {} }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.end(opts.body ? Buffer.from(opts.body) : undefined);
  });
}

function parseJson(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

(async () => {
  const base = 'https://awscu.vercel.app';
  const login = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', username: 'awsadmin@culko.in', password: 'awssbgadmin123' })
  });

  const token = parseJson(login.body, {}).token;
  if (!token) {
    throw new Error('Login failed: ' + login.body);
  }

  const list = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action: 'get-event-registrations' })
  });

  const registrations = parseJson(list.body, []);
  const knownSynthetic = registrations.filter((r) => {
    const haystack = `${r.name || ''} ${r.email || ''}`.toLowerCase();
    return /production live check|live certificate test|certificate design test|load test user|load test|test/i.test(haystack);
  });

  console.log(JSON.stringify({ knownSyntheticBefore: knownSynthetic.map(r => ({ id: r.id, name: r.name, email: r.email, status: r.status, eventId: r.eventId, date: r.date })) }, null, 2));

  for (const row of knownSynthetic) {
    const del = await request(base + '/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action: 'delete-event-registration', id: row.id })
    });
    console.log(JSON.stringify({ deleted: row.id, status: del.status, body: parseJson(del.body, {}) }, null, 2));
  }

  const statsAfterDelete = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action: 'get-stats' })
  });
  console.log(JSON.stringify({ statsAfterDelete: parseJson(statsAfterDelete.body, {}).counts }, null, 2));

  const create = await request(base + '/api/event-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: 'event-01',
      fullName: 'Synthetic Verification Temp',
      email: `synthetic.verification.temp+${Date.now()}@example.com`,
      phone: '+91 98765 43210',
      university: 'Chandigarh University – Uttar Pradesh',
      program: 'B.Tech CSE',
      year: '2nd Year',
      studentId: 'TEMP-VERIFY-001',
      interests: ['Cloud', 'AI'],
      experienceLevel: 'Beginner',
      linkedin: '',
      github: '',
      motivation: 'Temporary validation artifact for dashboard count verification.',
      consent: true
    })
  });

  const createPayload = parseJson(create.body, {});
  console.log(JSON.stringify({ createTemp: createPayload }, null, 2));

  const statsAfterCreate = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action: 'get-stats' })
  });
  console.log(JSON.stringify({ statsAfterCreate: parseJson(statsAfterCreate.body, {}).counts }, null, 2));

  if (createPayload.registrationId) {
    const deleteTemp = await request(base + '/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action: 'delete-event-registration', id: createPayload.registrationId })
    });
    console.log(JSON.stringify({ deletedTemp: createPayload.registrationId, status: deleteTemp.status, body: parseJson(deleteTemp.body, {}) }, null, 2));
  }

  const statsFinal = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action: 'get-stats' })
  });
  console.log(JSON.stringify({ finalStats: parseJson(statsFinal.body, {}).counts }, null, 2));
})();
