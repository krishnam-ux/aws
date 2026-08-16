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

function parse(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

(async () => {
  const base = 'https://awscu.vercel.app';
  const loginResponse = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', username: 'awsadmin@culko.in', password: 'awssbgadmin123' })
  });
  const token = parse(loginResponse.body, {}).token;
  console.log('TOKEN_OK', !!token);

  const beforeList = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action: 'get-event-registrations' })
  });
  const before = parse(beforeList.body, []);
  console.log('BEFORE_COUNT', before.length);
  console.log('BEFORE_IDS', before.map(r => r.id));

  const ids = before.filter(r => /(Production Live Check|LIVE CERTIFICATE TEST|CERTIFICATE DESIGN TEST|Load Test User|LOAD TEST)/i.test(`${r.name || ''} ${r.email || ''}`)).map(r => r.id);
  console.log('MATCH_IDS', ids);

  for (const id of ids) {
    const res = await request(base + '/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action: 'delete-event-registration', id })
    });
    console.log('DELETE_RESULT', id, res.status, parse(res.body, {}));
  }

  const afterList = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action: 'get-event-registrations' })
  });
  const after = parse(afterList.body, []);
  console.log('AFTER_COUNT', after.length);
  console.log('AFTER_IDS', after.map(r => r.id));

  const stats = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action: 'get-stats' })
  });
  console.log('STATS', parse(stats.body, {}));
})();
