async function setUnpublish() {
  console.log('Sending set-portal-status: false to https://www.awssbgcuup.tech/api/admin/exams...');
  const res = await fetch('https://www.awssbgcuup.tech/api/admin/exams', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer awssbg-admin-session-token-secure-hash',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'set-portal-status',
      published: false
    })
  });
  console.log('Admin POST status:', res.status);
  const data = await res.json();
  console.log('Admin POST response:', data);

  // Now verify public status
  const statusRes = await fetch('https://www.awssbgcuup.tech/api/exam/status', { cache: 'no-store' });
  const statusData = await statusRes.json();
  console.log('Public GET /api/exam/status:', statusData);
}

setUnpublish();
