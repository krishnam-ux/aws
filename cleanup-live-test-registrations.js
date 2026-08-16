const https = require('https');

function apiRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body: raw,
          });
        });
      }
    );

    req.on('error', reject);
    req.end(options.body ? Buffer.from(options.body) : undefined);
  });
}

(async () => {
  const base = 'https://awscu.vercel.app';
  const login = await apiRequest(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'login',
      username: 'awsadmin@culko.in',
      password: 'awssbgadmin123',
    }),
  });

  const loginData = JSON.parse(login.body || '{}');
  if (!loginData.token) {
    throw new Error('Login failed: ' + login.body);
  }

  const token = loginData.token;
  const list = await apiRequest(base + '/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({ action: 'get-event-registrations' }),
  });

  const registrations = JSON.parse(list.body || '[]');
  const matches = registrations.filter((r) => {
    const haystack = `${r.name || ''} ${r.email || ''}`.toLowerCase();
    return /production live check|live certificate test|certificate design test|load test user/i.test(haystack);
  });

  console.log(JSON.stringify({ beforeCount: registrations.length, matchedIds: matches.map((r) => r.id) }, null, 2));

  for (const row of matches) {
    const response = await apiRequest(base + '/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ action: 'delete-event-registration', id: row.id }),
    });

    console.log(JSON.stringify({ deletedId: row.id, status: response.status, body: response.body }, null, 2));
  }

  const recheck = await apiRequest(base + '/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({ action: 'get-event-registrations' }),
  });

  const finalRegistrations = JSON.parse(recheck.body || '[]');
  const remaining = finalRegistrations.filter((r) => {
    const haystack = `${r.name || ''} ${r.email || ''}`.toLowerCase();
    return /production live check|live certificate test|certificate design test|load test user/i.test(haystack);
  });

  console.log(JSON.stringify({ finalCount: finalRegistrations.length, remainingMatches: remaining.map((r) => ({ id: r.id, name: r.name, email: r.email })) }, null, 2));
})();
