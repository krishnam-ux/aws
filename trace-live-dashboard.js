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

(async () => {
  const base = 'https://awscu.vercel.app';
  const login = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', username: 'awsadmin@culko.in', password: 'awssbgadmin123' })
  });

  const token = JSON.parse(login.body || '{}').token;
  if (!token) {
    throw new Error('Login failed: ' + login.body);
  }

  const stats = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action: 'get-stats' })
  });

  const payload = JSON.parse(stats.body || '{}');
  console.log(JSON.stringify({
    counts: payload.counts,
    recentRegistrations: (payload.recentRegistrations || []).map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      eventId: r.eventId,
      status: r.status,
      attendance: r.attendance,
      date: r.date
    }))
  }, null, 2));
})();
