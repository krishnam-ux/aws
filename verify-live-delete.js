const base = 'https://www.awssbgcuup.tech';

async function api(path, body, token) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  const login = await api('/api/admin', {
    action: 'login',
    username: 'awsadmin@culko.in',
    password: 'awssbgadmin123'
  });
  console.log('LOGIN', JSON.stringify(login));
  const token = login.data && login.data.token ? login.data.token : null;
  if (!token) {
    throw new Error('Admin login failed');
  }

  const statsBefore = await api('/api/admin', { action: 'get-stats' }, token);
  console.log('STATS_BEFORE', JSON.stringify(statsBefore));

  const regsBefore = await api('/api/admin', { action: 'get-event-registrations' }, token);
  const beforeList = Array.isArray(regsBefore.data) ? regsBefore.data : [];
  console.log('REGS_BEFORE_COUNT', beforeList.length);

  let candidate = beforeList.find((r) => /synthetic|live delete test|production live check|live certificate test|certificate design test/i.test(`${r.name || ''} ${r.email || ''}`));

  if (!candidate) {
    console.log('NO_SAFE_CANDIDATE_FOUND_CREATING_ONE');
    const create = await fetch(base + '/api/event-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'event-01',
        fullName: `LIVE DELETE TEST ${Date.now()}`,
        email: `live.delete.test.${Date.now()}@example.com`,
        phone: '+91 98765 43210',
        university: 'Chandigarh University – Uttar Pradesh',
        program: 'B.Tech CSE',
        year: '2nd Year',
        studentId: `LIVE-DELETE-${Date.now()}`,
        interests: ['Cloud', 'AI'],
        experienceLevel: 'Beginner',
        linkedin: '',
        github: '',
        motivation: 'Synthetic verification row for production delete validation.',
        consent: true
      })
    });
    const createText = await create.text();
    let createData;
    try { createData = JSON.parse(createText); } catch { createData = { raw: createText }; }
    console.log('CREATE_RESULT', JSON.stringify({ status: create.status, data: createData }));
    if (!createData || !createData.registrationId) {
      throw new Error('Synthetic creation failed');
    }
    candidate = { id: createData.registrationId };
  }

  console.log('CANDIDATE_ID', candidate.id);

  const deleteRes = await api('/api/admin', { action: 'delete-event-registration', id: candidate.id }, token);
  console.log('DELETE_RESULT', JSON.stringify(deleteRes));

  const regsAfterDelete = await api('/api/admin', { action: 'get-event-registrations' }, token);
  const afterList = Array.isArray(regsAfterDelete.data) ? regsAfterDelete.data : [];
  console.log('REGS_AFTER_DELETE_COUNT', afterList.length);
  console.log('REGS_AFTER_DELETE_HAS_ID', afterList.some((r) => r.id === candidate.id));
  console.log('REGS_AFTER_DELETE_IDS', afterList.slice(0, 20).map((r) => r.id));

  const statsAfterDelete = await api('/api/admin', { action: 'get-stats' }, token);
  console.log('STATS_AFTER_DELETE', JSON.stringify(statsAfterDelete));

  const browserHit = await fetch(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'get-event-registrations' })
  });
  const browserText = await browserHit.text();
  console.log('BROWSER_REFETCH_STATUS', browserHit.status);
  console.log('BROWSER_REFETCH_CONTENT', browserText.slice(0, 900));
}

main().catch((err) => {
  console.error('VERIFY_ERROR', err);
  process.exit(1);
});
