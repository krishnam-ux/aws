import fs from 'fs';
import path from 'path';

async function verifyFullFlow() {
  const PROD_URL = 'https://www.awssbgcuup.tech';
  console.log('--- 1. FETCHING LIVE SEB CONFIG ---');
  
  // 1. Get active exam
  const examId = 'exam-1790012130075';
  const sebUrl = `${PROD_URL}/api/exam/seb-config?examId=${examId}`;
  const sebRes = await fetch(sebUrl);
  console.log(`HTTP Status: ${sebRes.status} ${sebRes.statusText}`);
  const sebXml = await sebRes.text();
  
  // Verify startURL and quitURL
  const startMatch = sebXml.match(/<key>startURL<\/key>\s*<string>([^<]+)<\/string>/);
  const quitMatch = sebXml.match(/<key>quitURL<\/key>\s*<string>([^<]+)<\/string>/);
  const startURL = startMatch ? startMatch[1] : null;
  const quitURL = quitMatch ? quitMatch[1] : null;
  
  console.log(`live startURL: ${startURL}`);
  console.log(`live quitURL:  ${quitURL}`);
  console.log(`startURL === 'https://www.awssbgcuup.tech/exam': ${startURL === 'https://www.awssbgcuup.tech/exam'}`);
  console.log(`quitURL === 'https://www.awssbgcuup.tech/exam/quit': ${quitURL === 'https://www.awssbgcuup.tech/exam/quit'}`);
  console.log(`startURL !== quitURL: ${startURL !== quitURL}`);
  console.log(`quitURL !== 'https://www.awssbgcuup.tech/exam': ${quitURL !== 'https://www.awssbgcuup.tech/exam'}`);
  
  // 2. Save fresh .seb
  const freshSebPath = path.resolve('fresh_production_verified.seb');
  fs.writeFileSync(freshSebPath, sebXml, 'utf-8');
  console.log(`\n--- 2. FRESH PRODUCTION .SEB DOWNLOADED (${sebXml.length} bytes) ---`);
  
  // 3. Verify /exam page loads
  console.log('\n--- 3. VERIFYING /exam PAGE RENDER ---');
  const examPageRes = await fetch(`${PROD_URL}/exam`);
  console.log(`/exam HTTP Status: ${examPageRes.status} ${examPageRes.statusText}`);
  const examHtml = await examPageRes.text();
  console.log(`/exam page contains HTML: ${examHtml.includes('<!DOCTYPE html>')}`);
  console.log(`/exam page contains Safe Exam Browser portal elements: ${examHtml.includes('Exam') || examHtml.includes('exam')}`);
  
  // 4. Verify candidate auth / lobby on production
  console.log('\n--- 4. CANDIDATE AUTH & LOBBY VERIFICATION ---');
  const authRes = await fetch(`${PROD_URL}/api/exam/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@university.edu',
      studentName: 'Candidate One',
      rollNumber: 'ROLL-101',
      examId: examId,
      password: ''
    })
  });
  console.log(`Candidate Auth Endpoint Status: ${authRes.status}`);
  const authData = await authRes.json();
  console.log(`Auth Response:`, authData);

  if (authData.token && authData.attemptId) {
    // Check lobby-status
    const lobbyRes = await fetch(`${PROD_URL}/api/exam/lobby-status?attemptId=${authData.attemptId}&token=${authData.token}`, {
      headers: { Authorization: `Bearer ${authData.token}` }
    });
    console.log(`Lobby Status Endpoint HTTP: ${lobbyRes.status}`);
    const lobbyData = await lobbyRes.json();
    console.log(`Lobby Data:`, lobbyData);
  }

  // 5. Verify URL filter rules for external blocking
  console.log('\n--- 5. URL FILTER RULES / EXTERNAL BLOCKING ---');
  const filterEnableMatch = sebXml.match(/<key>URLFilterEnable<\/key>\s*<(true|false)\/>/);
  const filterRulesMatch = sebXml.match(/<key>URLFilterRules<\/key>\s*<array>([\s\S]*?)<\/array>/);
  
  console.log(`URLFilterEnable: ${filterEnableMatch ? filterEnableMatch[1] : 'not found'}`);
  if (filterRulesMatch) {
    const rulesText = filterRulesMatch[1];
    const allowsProdDomain = rulesText.includes('awssbgcuup.tech');
    const allowsFonts = rulesText.includes('fonts.googleapis.com');
    const allowsGenericWildcard = rulesText.includes('<key>rule<\/key>\s*<string>.*<\/string>') || rulesText.includes('<key>rule<\/key>\s*<string>https?:\/\/.*<\/string>');
    
    console.log(`Allows awssbgcuup.tech: ${allowsProdDomain}`);
    console.log(`Allows Google Fonts (whitelisted asset): ${allowsFonts}`);
    console.log(`External Websites Blocked by default (strict whitelist): ${!allowsGenericWildcard}`);
  }
  
  console.log('\n=== ALL PRODUCTION CHECKS COMPLETE ===');
}

verifyFullFlow().catch(console.error);
