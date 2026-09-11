const baseUrl = 'https://www.awssbgcuup.tech';
const username = 'awsadmin@culko.in';
const password = 'awssbgadmin123';

async function run() {
  console.log('1. Testing Admin login on live site:', baseUrl);
  const loginRes = await fetch(`${baseUrl}/api/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', username, password })
  });

  console.log('Login HTTP status:', loginRes.status);
  const loginData = await loginRes.json();
  console.log('Login response:', loginData);

  if (!loginData.token) {
    console.error('Login failed');
    return;
  }

  const token = loginData.token;

  console.log('\n2. Fetching events from live site...');
  const eventsRes = await fetch(`${baseUrl}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action: 'get-events' })
  });

  const events = await eventsRes.json();
  console.log(`Found ${events.length} events on live site.`);
  console.log('First event:', {
    id: events[0]?.id,
    number: events[0]?.number,
    title: events[0]?.title,
    status: events[0]?.status,
    gallery: events[0]?.gallery
  });

  console.log('\n3. Testing upload-event-photo action on live site with clearly marked temporary image...');
  // 1x1 transparent PNG
  const tempTestPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const uploadRes = await fetch(`${baseUrl}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'upload-event-photo',
      base64Data: tempTestPng,
      fileName: 'temp-verification-probe.png',
      caption: 'TEMPORARY TEST PROBE - TO BE DELETED',
      eventId: events[0].id
    })
  });

  console.log('Upload HTTP status:', uploadRes.status);
  const uploadData = await uploadRes.json();
  console.log('Upload response:', uploadData);

  if (!uploadData.success || !uploadData.photo?.id) {
    console.log('LIVE DEPLOYMENT STATUS: upload-event-photo action is not yet active on live server or returned error.');
    return;
  }

  const tempPhotoId = uploadData.photo.id;
  console.log('\n4. Testing public photo serving for uploaded photo on live site:');
  const photoServeRes = await fetch(`${baseUrl}/api/event-photos?id=${tempPhotoId}`);
  console.log('Photo serve HTTP status:', photoServeRes.status, 'Content-Type:', photoServeRes.headers.get('content-type'));

  console.log('\n5. Deleting temporary test photo from live site...');
  const deleteRes = await fetch(`${baseUrl}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'delete-event-photo',
      id: tempPhotoId,
      eventId: events[0].id
    })
  });

  console.log('Delete response:', await deleteRes.json());

  console.log('\n6. Verifying temporary test photo is completely gone (expecting 404):');
  const verifyDeletedRes = await fetch(`${baseUrl}/api/event-photos?id=${tempPhotoId}`);
  console.log('Verify deleted HTTP status:', verifyDeletedRes.status);
}

run().catch(console.error);
