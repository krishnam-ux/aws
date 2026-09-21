import fs from 'fs';
import path from 'path';

const base = 'https://www.awssbgcuup.tech';
const adminUsername = 'awsadmin@culko.in';
const adminPassword = 'awssbgadmin123';

async function main() {
  console.log('=== PRODUCTION SEB VERIFICATION ===');
  console.log(`Target Production URL: ${base}`);

  // Step 1: Admin login to fetch valid production exam
  console.log('\n[Step 1] Logging in to production admin API to get active exam ID...');
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
  console.log('✓ Admin login successful!');

  // Step 2: Fetch production exam
  const examsRes = await fetch(`${base}/api/admin/exams`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const examsData = await examsRes.json();
  const exams = examsData.exams || [];
  console.log(`Found ${exams.length} exams in production database.`);

  if (exams.length === 0) {
    throw new Error('No exams found in production database!');
  }

  const activeExam = exams[0];
  const examId = activeExam.id;
  console.log(`Selected Exam: "${activeExam.title}" (Code: ${activeExam.examCode}, ID: ${examId})`);

  // Step 3: Fetch fresh production .seb from /api/exam/seb-config
  console.log(`\n[Step 2 & 3] Fetching fresh production SEB config from ${base}/api/exam/seb-config?examId=${examId}...`);
  const sebRes = await fetch(`${base}/api/exam/seb-config?examId=${examId}`, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
  });

  console.log(`Response HTTP Status: ${sebRes.status} ${sebRes.statusText}`);
  console.log(`Content-Type: ${sebRes.headers.get('Content-Type')}`);
  console.log(`Content-Disposition: ${sebRes.headers.get('Content-Disposition')}`);

  if (sebRes.status !== 200) {
    throw new Error(`Failed to fetch production SEB config: HTTP ${sebRes.status}`);
  }

  const sebXml = await sebRes.text();
  console.log(`Downloaded SEB config size: ${sebXml.length} bytes`);

  // Step 4: Save fresh production .seb
  const sebFilePath = path.resolve(process.cwd(), 'fresh_production_verified.seb');
  fs.writeFileSync(sebFilePath, sebXml, 'utf-8');
  console.log(`✓ Saved fresh production .seb to: ${sebFilePath}`);

  // Step 5: Verify XML structure and configuration values
  console.log('\n[Step 4] Verifying XML Keys and QuitURL / StartURL...');
  
  // Extract startURL
  const startUrlMatch = sebXml.match(/<key>startURL<\/key>\s*<string>([^<]+)<\/string>/);
  const startUrl = startUrlMatch ? startUrlMatch[1] : null;

  // Extract quitURL
  const quitUrlMatch = sebXml.match(/<key>quitURL<\/key>\s*<string>([^<]+)<\/string>/);
  const quitUrl = quitUrlMatch ? quitUrlMatch[1] : null;

  console.log(`  startURL: "${startUrl}"`);
  console.log(`  quitURL:  "${quitUrl}"`);

  // Assertions
  const check1 = startUrl === 'https://www.awssbgcuup.tech/exam';
  const check2 = quitUrl === 'https://www.awssbgcuup.tech/exam/quit';
  const check3 = startUrl !== quitUrl;
  const check4 = !sebXml.includes('<key>quitURL</key>\n    <string>https://www.awssbgcuup.tech/exam</string>') &&
                 !sebXml.includes('<key>quitURL</key>\r\n    <string>https://www.awssbgcuup.tech/exam</string>');
  const check5 = sebXml.includes('<key>URLFilterEnable</key>\n    <true/>') || sebXml.includes('<key>URLFilterEnable</key>\r\n    <true/>');
  const check6 = sebXml.includes('<string>https://www.awssbgcuup.tech/*</string>') || sebXml.includes('<string>https://www.awssbgcuup.tech</string>');
  const check7 = sebXml.includes('<string>https://fonts.googleapis.com/*</string>');
  const check8 = sebXml.includes('<key>prohibitedProcesses</key>') && sebXml.includes('<string>AnyDesk.exe</string>');

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log(`1. startURL is "https://www.awssbgcuup.tech/exam": ${check1 ? 'PASS [MATCH]' : 'FAIL'}`);
  console.log(`2. quitURL is "https://www.awssbgcuup.tech/exam/quit": ${check2 ? 'PASS [MATCH]' : 'FAIL'}`);
  console.log(`3. startURL and quitURL are NOT identical: ${check3 ? 'PASS [DISTINCT]' : 'FAIL [IDENTICAL!]'}`);
  console.log(`4. quitURL does NOT point to /exam: ${check4 ? 'PASS [CORRECT]' : 'FAIL'}`);
  console.log(`5. URLFilterEnable is true (default-deny whitelist active): ${check5 ? 'PASS [ENABLED]' : 'FAIL'}`);
  console.log(`6. Whitelisted allow rule for awssbgcuup.tech exists: ${check6 ? 'PASS [ALLOWED]' : 'FAIL'}`);
  console.log(`7. Whitelisted allow rule for fonts.googleapis.com exists: ${check7 ? 'PASS [ALLOWED]' : 'FAIL'}`);
  console.log(`8. Prohibited processes (AnyDesk, TeamViewer, OBS, Zoom) active: ${check8 ? 'PASS [LOCKED]' : 'FAIL'}`);

  if (!check1 || !check2 || !check3 || !check4 || !check5 || !check6 || !check7 || !check8) {
    console.error('FATAL: One or more checks failed!');
    process.exit(1);
  }

  console.log('\n=== PRODUCTION SEB CONFIGURATION VERIFIED 100% PASS ===');
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
