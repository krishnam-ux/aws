const fs = require('fs');
const path = require('path');
const https = require('https');

const outDir = path.resolve(__dirname, 'tmp-cert');
fs.mkdirSync(outDir, { recursive: true });

function httpJson(url, body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;

    const req = https.request(url, { method: 'POST', headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = raw ? JSON.parse(raw) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: raw, raw });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const baseUrl = 'https://awscu.vercel.app';
  const adminUrl = baseUrl + '/api/admin';

  const loginRes = await httpJson(adminUrl, {
    action: 'login',
    username: 'awsadmin@culko.in',
    password: 'awssbgadmin123'
  });

  console.log('LOGIN', JSON.stringify(loginRes));

  const token = loginRes && loginRes.body && loginRes.body.token;
  if (!token) {
    throw new Error('No login token returned: ' + JSON.stringify(loginRes));
  }

  const eventsRes = await httpJson(adminUrl, { action: 'get-events' }, token);
  console.log('EVENTS_STATUS', eventsRes.status);

  const event = Array.isArray(eventsRes.body) ? eventsRes.body.find((entry) => entry.id === 'event-01') : null;
  console.log('EVENT_FOUND', !!event, event && event.registrationStatus);

  if (!event) {
    throw new Error('event-01 not found in production');
  }

  if (event.registrationStatus !== 'Open') {
    const updateRes = await httpJson(adminUrl, {
      action: 'update-event',
      event: { ...event, registrationStatus: 'Open', status: 'Upcoming' }
    }, token);
    console.log('UPDATE_EVENT', JSON.stringify(updateRes));
  }

  const ts = Date.now();
  const email = 'live-certificate-test-' + ts + '@example.com';
  const studentId = 'LIVE-CERT-' + ts;

  const regPayload = {
    eventId: 'event-01',
    fullName: 'LIVE CERTIFICATE TEST',
    email,
    phone: '+91 98765 43210',
    university: 'Chandigarh University – Uttar Pradesh',
    program: 'B.Tech CSE',
    year: '2nd Year',
    studentId,
    interests: ['Cloud', 'AI'],
    experienceLevel: 'Beginner',
    linkedin: '',
    github: '',
    motivation: 'Production verification test.',
    consent: true
  };

  const publicRes = await httpJson(baseUrl + '/api/event-register', regPayload);
  console.log('PUBLIC_REGISTER', JSON.stringify(publicRes));

  if (publicRes.status !== 200 || !publicRes.body || !publicRes.body.success) {
    throw new Error('Public registration failed: ' + JSON.stringify(publicRes));
  }

  const regsRes = await httpJson(adminUrl, { action: 'get-event-registrations' }, token);
  console.log('ADMIN_REGS_STATUS', regsRes.status);

  const liveReg = Array.isArray(regsRes.body)
    ? regsRes.body.find((entry) => entry.email === email)
    : null;

  console.log('LIVE_REG_FOUND', !!liveReg, liveReg && liveReg.id);

  if (!liveReg) {
    throw new Error('Registration not found in admin list: ' + JSON.stringify(regsRes));
  }

  const setRes = await httpJson(adminUrl, {
    action: 'set-attendance',
    id: liveReg.id,
    attendance: 'Attended'
  }, token);

  console.log('SET_ATTENDANCE', JSON.stringify(setRes));

  if (setRes.status !== 200 || !setRes.body || !setRes.body.success) {
    throw new Error('Set attendance failed: ' + JSON.stringify(setRes));
  }

  const generateRes = await httpJson(adminUrl, {
    action: 'generate-certificate',
    registrationId: liveReg.id
  }, token);

  console.log('GENERATE_CERT', JSON.stringify(generateRes));

  if (generateRes.status !== 200 || !generateRes.body || !generateRes.body.success) {
    throw new Error('Certificate generation failed: ' + JSON.stringify(generateRes));
  }

  const cert = generateRes.body.certificate;
  const certId = cert && (cert.certificateId || cert.certificate_id);
  if (!cert || !certId) {
    throw new Error('Generate response missing certificateId: ' + JSON.stringify(generateRes));
  }

  const downloadRes = await httpJson(adminUrl, {
    action: 'download-certificate',
    registrationId: liveReg.id
  }, token);

  console.log('DOWNLOAD_STATUS', downloadRes.status);
  console.log('CONTENT_TYPE', downloadRes.headers && downloadRes.headers['content-type']);

  if (downloadRes.status !== 200) {
    throw new Error('Download returned non-200: ' + JSON.stringify(downloadRes));
  }

  const contentType = String(downloadRes.headers && downloadRes.headers['content-type'] || '');
  if (!contentType.toLowerCase().includes('application/pdf')) {
    throw new Error('Content-Type is not PDF: ' + contentType);
  }

  const pdfBuffer = Buffer.isBuffer(downloadRes.body)
    ? downloadRes.body
    : Buffer.from(downloadRes.raw || '', 'binary');

  console.log('PDF_HEADER', pdfBuffer.subarray(0, 4).toString('latin1'));
  console.log('PDF_SIZE', pdfBuffer.length);

  if (pdfBuffer.length <= 0) {
    throw new Error('Downloaded PDF is empty');
  }

  if (pdfBuffer.subarray(0, 4).toString('latin1') !== '%PDF') {
    throw new Error('Downloaded file does not begin with %PDF');
  }

  const pdfPath = path.join(outDir, 'live-certificate-' + ts + '.pdf');
  fs.writeFileSync(pdfPath, pdfBuffer);
  console.log('SAVED_PDF', pdfPath);

  console.log('SUMMARY', JSON.stringify({
    registrationId: liveReg.id,
    certificateId: certId,
    email,
    studentId,
    pdfSize: pdfBuffer.length,
    pdfPath
  }));

  const deleteRes = await httpJson(adminUrl, {
    action: 'delete-event-registration',
    id: liveReg.id
  }, token);

  console.log('DELETE_REGISTRATION', JSON.stringify(deleteRes));
}

main().catch((err) => {
  console.error('FATAL_ERROR', err && err.stack ? err.stack : err);
  process.exit(1);
});
