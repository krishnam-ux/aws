import https from 'https';

function request(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: opts.method || 'GET',
      headers: opts.headers || {}
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: raw }));
    });
    req.on('error', reject);
    if (opts.body) {
      req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    }
    req.end();
  });
}

function parse(raw, fallback = null) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

async function main() {
  const base = 'https://www.awssbgcuup.tech';
  const loginRes = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { action: 'login', username: process.env.ADMIN_EMAIL || 'awsadmin@culko.in', password: process.env.ADMIN_PASSWORD || '' }
  });
  const token = parse(loginRes.body, {}).token;

  const regsRes = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: { action: 'get-event-registrations' }
  });

  const regs = parse(regsRes.body, []);
  console.log(`Total live event registrations: ${regs.length}`);
  
  const regsByEvent = {};
  for (const r of regs) {
    regsByEvent[r.eventId] = (regsByEvent[r.eventId] || 0) + 1;
  }
  console.log('Registrations by eventId:', regsByEvent);

  if (regs.length > 0) {
    console.log('Sample registrations:', regs.slice(0, 3).map(r => ({
      id: r.id,
      eventId: r.eventId,
      name: r.name,
      email: r.email,
      status: r.status
    })));
  }
}

main().catch(console.error);
