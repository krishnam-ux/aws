const baseUrl = 'https://www.awssbgcuup.tech';
const username = 'awsadmin@culko.in';
const password = 'awssbgadmin123';

async function postAdmin(token, body) {
  const res = await fetch(`${baseUrl}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { status: res.status, ok: res.ok, data, headers: res.headers, raw: text };
}

async function login() {
  const result = await postAdmin(null, { action: 'login', username, password });
  if (!result.ok || !result.data?.token) {
    throw new Error(`Admin login failed (${result.status}): ${JSON.stringify(result.data)}`);
  }
  return result.data.token;
}

async function createRegistration(eventId) {
  const stamp = Date.now();
  const res = await fetch(`${baseUrl}/api/event-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId,
      fullName: `LIVE CERTIFICATE TEST ${stamp}`,
      email: `live.cert.test.${stamp}@example.com`,
      phone: '+91 98765 43210',
      university: 'Chandigarh University – Uttar Pradesh',
      program: 'B.Tech CSE',
      year: '2nd Year',
      studentId: `CERT-TEST-${stamp}`,
      interests: ['Cloud'],
      experienceLevel: 'Beginner',
      linkedin: '',
      github: '',
      motivation: 'Synthetic verification registration for certificate layout check.',
      consent: true
    })
  });

  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (res.status !== 200 || !data?.registrationId) {
    throw new Error(`Registration creation failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data.registrationId;
}

async function run() {
  console.log('--- STARTING LIVE PRODUCTION CERTIFICATE VERIFICATION ---');
  
  const token = await login();
  console.log('1. Admin login: SUCCESS');

  // Fetch events to get a valid eventId
  const eventsRes = await postAdmin(token, { action: 'get-events' });
  if (!eventsRes.ok || !Array.isArray(eventsRes.data) || eventsRes.data.length === 0) {
    throw new Error('No events found in live database to test registration');
  }
  const eventId = eventsRes.data[0].id;
  console.log(`2. Picked valid event ID for registration: ${eventId}`);

  // Create temporary registration
  const registrationId = await createRegistration(eventId);
  console.log(`3. Created temporary registration: ${registrationId}`);

  // Update registration to Attended/Attended (eligible for certificate)
  const updateRes = await postAdmin(token, {
    action: 'update-event-registration',
    id: registrationId,
    attendance: 'Attended',
    status: 'Attended',
    notes: 'Marked attended for live certificate layout verification.'
  });
  if (!updateRes.ok || !updateRes.data?.success) {
    throw new Error(`Failed to update registration status: ${JSON.stringify(updateRes.data)}`);
  }
  console.log('3. Marked registration as Attended: SUCCESS');

  // Generate certificate
  console.log('4. Generating certificate...');
  const genRes = await postAdmin(token, {
    action: 'generate-certificate',
    registrationId
  });
  const cert = genRes.data?.certificate;
  if (!genRes.ok || !genRes.data?.success || !cert || (!cert.certificateId && !cert.certificate_id)) {
    throw new Error(`Failed to generate certificate: ${JSON.stringify(genRes.data)}`);
  }
  const certificateId = cert.certificateId || cert.certificate_id;
  console.log(`5. Certificate generated successfully. ID: ${certificateId}`);

  // Download certificate PDF and verify structure
  console.log('6. Downloading certificate PDF...');
  const downloadRes = await fetch(`${baseUrl}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'download-certificate',
      registrationId
    })
  });

  if (downloadRes.status !== 200) {
    throw new Error(`Failed to download certificate PDF. Status: ${downloadRes.status}`);
  }

  const pdfBuffer = Buffer.from(await downloadRes.arrayBuffer());
  if (pdfBuffer.length < 1000) {
    throw new Error(`Downloaded PDF buffer is too small: ${pdfBuffer.length} bytes`);
  }
  if (pdfBuffer.toString('utf-8', 0, 5) !== '%PDF-') {
    throw new Error(`Downloaded buffer is not a valid PDF file`);
  }
  console.log(`7. Certificate PDF downloaded and validated: ${pdfBuffer.length} bytes`);

  // Verify verification link
  console.log('8. Testing certificate public verification URL...');
  const verifyRes = await fetch(`${baseUrl}/api/verify-certificate/${encodeURIComponent(certificateId)}`);
  if (verifyRes.status !== 200) {
    throw new Error(`Public verification URL returned status ${verifyRes.status}`);
  }
  const verifyData = await verifyRes.json();
  if (verifyData.status !== 'Valid' || verifyData.certificateId !== certificateId) {
    throw new Error(`Verification endpoint returned invalid data: ${JSON.stringify(verifyData)}`);
  }
  console.log('9. Public verification page verified successfully: VALID');

  // Cleanup: delete registration
  console.log('10. Deleting temporary registration for cleanup...');
  const deleteRes = await postAdmin(token, {
    action: 'delete-event-registration',
    id: registrationId
  });
  if (!deleteRes.ok || !deleteRes.data?.success) {
    console.warn(`WARNING: Failed to cleanup test registration ${registrationId}`);
  } else {
    console.log('11. Cleanup temporary registration: SUCCESS');
  }

  console.log('\n--- LIVE PRODUCTION CERTIFICATE VERIFICATION COMPLETE: ALL PASSED ---');
}

run().catch((err) => {
  console.error('\nLIVE PRODUCTION CERTIFICATE VERIFICATION FAILED:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
