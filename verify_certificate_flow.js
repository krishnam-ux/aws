const fs = require('fs');

(async () => {
  const base = 'http://127.0.0.1:3000/api/admin';
  const loginRes = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'login',
      username: 'awsadmin@culko.in',
      password: 'awssbgadmin123'
    })
  });

  const loginData = await loginRes.json();
  console.log('LOGIN', loginRes.status, JSON.stringify(loginData));

  const token = loginData.token;
  if (!token) {
    throw new Error('No admin token returned');
  }

  const listRes = await fetch(base, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action: 'get-event-registrations' })
  });

  const list = await listRes.json();
  console.log('REG COUNT', Array.isArray(list) ? list.length : 'not-array');

  const reg = Array.isArray(list) ? (list.find(r => r.status === 'Attended') || list[0]) : null;
  console.log('SELECTED', reg ? JSON.stringify({ id: reg.id, name: reg.name, status: reg.status, certificateId: reg.certificateId }) : 'none');

  if (!reg) {
    process.exit(1);
  }

  const genRes = await fetch(base, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action: 'generate-certificate', registrationId: reg.id })
  });

  const genData = await genRes.json();
  console.log('GENERATE', genRes.status, JSON.stringify(genData));

  const downRes = await fetch(base, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action: 'download-certificate', registrationId: reg.id })
  });

  console.log('DOWNLOAD STATUS', downRes.status, downRes.headers.get('content-type'), downRes.headers.get('content-disposition'));
  const buffer = Buffer.from(await downRes.arrayBuffer());
  const file = 'c:/Users/krish/aws/local-verified-certificate.pdf';
  fs.writeFileSync(file, buffer);
  console.log('SAVED', file, 'SIZE', buffer.length);
})();
