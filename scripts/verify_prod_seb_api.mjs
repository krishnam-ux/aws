import fs from 'fs';

const base = 'https://www.awssbgcuup.tech';
const adminUsername = 'awsadmin@culko.in';
const adminPassword = 'awssbgadmin123';

async function main() {
  console.log('--- LOGGING IN TO PRODUCTION ADMIN API ---');
  const loginRes = await fetch(`${base}/api/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', username: adminUsername, password: adminPassword })
  });

  const loginData = await loginRes.json();
  if (!loginData.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  console.log('Admin login successful!');

  // Fetch exams from production
  console.log('Fetching production exams list...');
  const examsRes = await fetch(`${base}/api/admin/exams`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const examsData = await examsRes.json();
  const exams = examsData.exams || [];
  console.log(`Found ${exams.length} exams on production.`);

  let examId = null;
  if (exams.length > 0) {
    examId = exams[0].id;
    console.log(`Using existing production exam: ${exams[0].title} (ID: ${examId})`);
  } else {
    console.log('Creating verification exam on production...');
    const createRes = await fetch(`${base}/api/admin/exams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'create',
        exam: {
          examCode: 'AWS-CERT-PROD-TEST',
          title: 'AWS Production SEB Verification Exam',
          description: 'Live test of SEB URL filter configuration',
          category: 'Cloud Architecture',
          durationMinutes: 45,
          passingPercentage: 70,
          maxAttempts: 1,
          status: 'Published',
          requireSecureBrowser: true,
          maxSecurityViolations: 3,
          questions: [
            {
              id: 'q1',
              question: 'Which AWS service is used for block storage?',
              options: ['Amazon EBS', 'Amazon S3', 'Amazon EFS', 'AWS Storage Gateway'],
              correctOptionIndex: 0,
              marks: 10,
              explanation: 'EBS is block storage.'
            }
          ]
        }
      })
    });
    const createData = await createRes.json();
    examId = createData.exam?.id;
    console.log('Created exam with ID:', examId);
  }

  // Now fetch SEB config from production /api/exam/seb-config
  console.log(`\n--- FETCHING LIVE PRODUCTION SEB CONFIG FROM ${base}/api/exam/seb-config?examId=${examId} ---`);
  const sebRes = await fetch(`${base}/api/exam/seb-config?examId=${examId}`, {
    headers: { 'Cache-Control': 'no-cache' }
  });

  console.log('HTTP Status:', sebRes.status);
  console.log('Content-Type:', sebRes.headers.get('Content-Type'));
  console.log('Cache-Control:', sebRes.headers.get('Cache-Control'));

  const sebXml = await sebRes.text();
  console.log('Config length:', sebXml.length, 'bytes');
  fs.writeFileSync('production_verified.seb', sebXml, 'utf-8');

  // Verify contents
  console.log('\n--- VERIFYING LIVE PRODUCTION CONFIGURATION ---');

  const hasStartUrl = sebXml.includes('<key>startURL</key>\n    <string>https://www.awssbgcuup.tech/exam</string>') ||
                      sebXml.includes('<key>startURL</key>\r\n    <string>https://www.awssbgcuup.tech/exam</string>') ||
                      sebXml.includes('<string>https://www.awssbgcuup.tech/exam</string>');
  console.log('1. Start URL points to https://www.awssbgcuup.tech/exam:', hasStartUrl ? 'PASS [YES]' : 'FAIL [NO]');

  const hasOldBlock = sebXml.includes('<string>*</string>') && sebXml.includes('<integer>0</integer>');
  console.log('2. Old catch-all wildcard block (action=0, expression=*) removed:', !hasOldBlock ? 'PASS [REMOVED]' : 'FAIL [STILL PRESENT]');

  const hasAwssbgAllow = sebXml.includes('<string>https://www.awssbgcuup.tech/*</string>') || sebXml.includes('<string>https://www.awssbgcuup.tech</string>');
  console.log('3. Allows production domain https://www.awssbgcuup.tech:', hasAwssbgAllow ? 'PASS [ALLOWED]' : 'FAIL [NOT ALLOWED]');

  const hasFontsAllow = sebXml.includes('<string>https://fonts.googleapis.com/*</string>');
  console.log('4. Allows Google Fonts:', hasFontsAllow ? 'PASS [ALLOWED]' : 'FAIL [NOT ALLOWED]');

  const hasLockdown = sebXml.includes('<key>allowDeveloperConsole</key>') && sebXml.includes('<key>prohibitedProcesses</key>');
  console.log('5. SEB Security & Kiosk Lockdown active:', hasLockdown ? 'PASS [ACTIVE]' : 'FAIL [INACTIVE]');

  console.log('\n--- PRODUCTION XML URL FILTER RULES ---');
  const rulesSection = sebXml.match(/<key>URLFilterRules<\/key>[\s\S]*?<\/array>/);
  if (rulesSection) {
    console.log(rulesSection[0]);
  }
}

main().catch(console.error);
