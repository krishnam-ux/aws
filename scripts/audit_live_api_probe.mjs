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
  console.log('1. Testing Admin Login on:', base);
  const loginRes = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { action: 'login', username: process.env.ADMIN_EMAIL || 'awsadmin@culko.in', password: process.env.ADMIN_PASSWORD || '' }
  });

  console.log('Login status:', loginRes.status);
  const loginData = parse(loginRes.body, {});
  const token = loginData.token;
  console.log('Token acquired:', !!token);

  if (!token) {
    console.error('Failed to get token:', loginRes.body);
    return;
  }

  console.log('\n2. Fetching Admin Weekly Quiz Dashboard Data...');
  const quizDashboardRes = await request(base + '/api/admin/weekly-quiz', {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token }
  });
  console.log('Weekly Quiz Dashboard Status:', quizDashboardRes.status);
  const dashData = parse(quizDashboardRes.body, {});
  console.log('Dashboard Data Summary:');
  console.log('- Quizzes:', dashData.quizzes?.length || 0);
  console.log('- Attempts:', dashData.attempts?.length || 0);
  console.log('- Events:', dashData.events?.length || 0);
  console.log('- Metrics:', dashData.metrics);
  console.log('- Settings:', dashData.settings);

  if (dashData.quizzes && dashData.quizzes.length > 0) {
    console.log('\nQuizzes details:');
    dashData.quizzes.forEach((q, i) => {
      console.log(`[${i+1}] ID: ${q.id} | Title: ${q.title} | Status: ${q.status} | Session: ${q.sessionId} | Start: ${q.scheduledStartAt} | End: ${q.scheduledEndAt} | Total Qs in Bank: ${q.questionBank?.length || 0}`);
    });
  }

  if (dashData.events && dashData.events.length > 0) {
    console.log('\nEvents list:');
    dashData.events.forEach((e, i) => {
      console.log(`[${i+1}] ID: ${e.id} | Title: ${e.title} | Status: ${e.status} | Date: ${e.date}`);
    });
  }
}

main().catch(console.error);
