#!/usr/bin/env node
/**
 * Production Load Test: 100–400 Registrations
 * 
 * Tests the complete registration flow with synthetic data only.
 * Verifies: API responses, database persistence, Admin Portal visibility, consistency.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, 'load-test-results');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const BASE_URL = 'https://awscu.vercel.app';
const ADMIN_URL = `${BASE_URL}/api/admin`;
const REGISTER_URL = `${BASE_URL}/api/event-register`;
const EVENT_ID = 'event-01';
const ADMIN_TOKEN = 'awssbg-admin-session-token-secure-hash';

let testResults = {
  testRunId: `LOAD-TEST-${Date.now()}`,
  startTime: new Date().toISOString(),
  batches: [],
  summary: {},
  adminPortalCheck: {},
  databaseConsistency: {},
  errors: []
};

function httpJson(url, body, token, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;

    const timeoutHandle = setTimeout(() => {
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    const req = https.request(url, { method: 'POST', headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        clearTimeout(timeoutHandle);
        try {
          const parsed = raw ? JSON.parse(raw) : null;
          resolve({ status: res.statusCode, body: parsed, raw });
        } catch (e) {
          resolve({ status: res.statusCode, body: raw, raw });
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeoutHandle);
      reject(err);
    });
    req.write(payload);
    req.end();
  });
}

async function loginAdmin() {
  console.log('\n[SETUP] Logging in to Admin Portal...');
  const res = await httpJson(ADMIN_URL, {
    action: 'login',
    username: 'awsadmin@culko.in',
    password: 'awssbgadmin123'
  });

  if (res.status !== 200 || !res.body?.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(res)}`);
  }
  console.log('✓ Admin login successful');
  return res.body.token;
}

async function ensureEventOpen() {
  console.log('[SETUP] Ensuring event registration is open...');
  const eventsRes = await httpJson(ADMIN_URL, { action: 'get-events' }, ADMIN_TOKEN);
  const event = Array.isArray(eventsRes.body) ? eventsRes.body.find(e => e.id === EVENT_ID) : null;

  if (!event) {
    throw new Error(`Event ${EVENT_ID} not found`);
  }

  if (event.registrationStatus !== 'Open') {
    console.log('  Opening event registration...');
    const updateRes = await httpJson(ADMIN_URL, {
      action: 'update-event',
      event: { ...event, registrationStatus: 'Open', status: 'Upcoming' }
    }, ADMIN_TOKEN);

    if (updateRes.status !== 200) {
      throw new Error(`Failed to open event: ${JSON.stringify(updateRes)}`);
    }
  }

  console.log('✓ Event registration is open');
}

async function submitBatchRegistrations(batchSize, startIdx) {
  console.log(`\n[BATCH ${startIdx / batchSize + 1}] Submitting ${batchSize} registrations...`);

  const batchStartTime = Date.now();
  const results = {
    batchSize,
    submitted: 0,
    successful: 0,
    failed: 0,
    statusCodes: {},
    responseTimes: [],
    registrationIds: [],
    errors: []
  };

  const registrations = [];

  // Prepare batch
  for (let i = 0; i < batchSize; i++) {
    const idx = startIdx + i;
    const ts = Date.now();
    registrations.push({
      eventId: EVENT_ID,
      fullName: `LOAD TEST - DO NOT KEEP - ${idx}`,
      email: `loadtest-${ts}-${idx}@test.awssbg.local`,
      phone: '+91 99999 99999',
      university: 'Chandigarh University – Uttar Pradesh',
      program: 'B.Tech CSE',
      year: '2nd Year',
      studentId: `LOADTEST-${ts}-${idx}`,
      interests: ['Cloud', 'AI'],
      experienceLevel: 'Beginner',
      linkedin: '',
      github: '',
      motivation: `Synthetic load test record #${idx}`,
      consent: true
    });
  }

  // Submit sequentially with small delays to avoid overwhelming the server
  for (let i = 0; i < registrations.length; i++) {
    const reg = registrations[i];
    results.submitted++;

    const reqStart = Date.now();
    try {
      const res = await httpJson(REGISTER_URL, reg);
      const responseTime = Date.now() - reqStart;
      results.responseTimes.push(responseTime);

      const statusStr = String(res.status);
      results.statusCodes[statusStr] = (results.statusCodes[statusStr] || 0) + 1;

      if (res.status === 200 && res.body?.success && res.body?.registrationId) {
        results.successful++;
        results.registrationIds.push(res.body.registrationId);
      } else {
        results.failed++;
        results.errors.push({
          index: i,
          status: res.status,
          message: res.body?.error || 'Unknown error',
          body: res.body
        });
      }
    } catch (err) {
      results.failed++;
      results.responseTimes.push(Date.now() - reqStart);
      results.statusCodes['TIMEOUT'] = (results.statusCodes['TIMEOUT'] || 0) + 1;
      results.errors.push({
        index: i,
        status: 'ERROR',
        message: err.message
      });
    }

    // Small delay between requests
    if (i % 10 === 0 && i > 0) {
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, 100));
    }
  }

  const batchTime = Date.now() - batchStartTime;
  results.batchTime = batchTime;
  results.avgResponseTime = results.responseTimes.length > 0
    ? (results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length).toFixed(2)
    : 0;
  results.maxResponseTime = results.responseTimes.length > 0
    ? Math.max(...results.responseTimes)
    : 0;
  results.minResponseTime = results.responseTimes.length > 0
    ? Math.min(...results.responseTimes)
    : 0;

  console.log(
    `\n✓ Batch complete: ${results.successful}/${results.submitted} successful ` +
    `(${(results.successful / results.submitted * 100).toFixed(1)}%) ` +
    `in ${(batchTime / 1000).toFixed(2)}s`
  );
  console.log(
    `  Avg: ${results.avgResponseTime}ms | Max: ${results.maxResponseTime}ms | Min: ${results.minResponseTime}ms`
  );

  if (Object.keys(results.statusCodes).length > 0) {
    console.log(`  Status codes:`, results.statusCodes);
  }

  if (results.errors.length > 0 && results.errors.length <= 5) {
    console.log(`  Sample errors:`, results.errors.slice(0, 3));
  }

  return results;
}

async function getAdminRegistrations() {
  const res = await httpJson(ADMIN_URL, { action: 'get-event-registrations' }, ADMIN_TOKEN);
  if (res.status !== 200 || !Array.isArray(res.body)) {
    throw new Error(`Failed to fetch admin registrations: ${JSON.stringify(res)}`);
  }
  return res.body;
}

async function runLoadTest() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      PRODUCTION LOAD TEST: 100–400 REGISTRATIONS           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Setup
    await loginAdmin();
    await ensureEventOpen();

    // Test batches: 100, 200, 300, 400
    const batchSizes = [100, 200, 300, 400];
    let totalSubmitted = 0;
    let cumulativeResults = [];

    for (const batchSize of batchSizes) {
      const batchResults = await submitBatchRegistrations(batchSize, totalSubmitted);
      cumulativeResults.push(batchResults);
      testResults.batches.push(batchResults);
      totalSubmitted += batchSize;

      // Delay between batches
      await new Promise(r => setTimeout(r, 2000));
    }

    // Summary
    const totalSuccessful = cumulativeResults.reduce((sum, b) => sum + b.successful, 0);
    const totalFailed = cumulativeResults.reduce((sum, b) => sum + b.failed, 0);
    const allRegistrationIds = cumulativeResults.flatMap(b => b.registrationIds);

    testResults.summary = {
      totalSubmitted: totalSubmitted,
      totalSuccessful,
      totalFailed,
      successRate: (totalSuccessful / totalSubmitted * 100).toFixed(2) + '%',
      uniqueRegistrationIds: new Set(allRegistrationIds).size,
      duplicateCount: allRegistrationIds.length - new Set(allRegistrationIds).size
    };

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    CUMULATIVE SUMMARY                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Total Submitted:     ${totalSubmitted}`);
    console.log(`Total Successful:    ${totalSuccessful}`);
    console.log(`Total Failed:        ${totalFailed}`);
    console.log(`Success Rate:        ${testResults.summary.successRate}`);
    console.log(`Unique Reg IDs:      ${testResults.summary.uniqueRegistrationIds}`);
    console.log(`Duplicate Records:   ${testResults.summary.duplicateCount}`);

    // Verify via Admin Portal
    console.log('\n[VERIFICATION] Fetching registrations from Admin Portal...');
    const adminRegs = await getAdminRegistrations();
    
    // Check if each API-reported registration ID is actually in the admin portal
    const adminRegIds = new Set(adminRegs.map(r => r.id));
    const foundInAdminPortal = allRegistrationIds.filter(id => adminRegIds.has(id));
    const missingFromAdminPortal = allRegistrationIds.filter(id => !adminRegIds.has(id));

    testResults.adminPortalCheck = {
      totalInAdminPortal: adminRegs.length,
      apiReportedIds: allRegistrationIds.length,
      foundInAdminPortal: foundInAdminPortal.length,
      missingFromAdminPortal: missingFromAdminPortal.length,
      sampleMissingIds: missingFromAdminPortal.slice(0, 5)
    };

    console.log(`✓ API reported ${allRegistrationIds.length} registration IDs`);
    console.log(`✓ Admin Portal found ${foundInAdminPortal.length}/${allRegistrationIds.length} IDs (${(foundInAdminPortal.length / allRegistrationIds.length * 100).toFixed(1)}%)`);
    
    if (missingFromAdminPortal.length > 0) {
      console.log(`✗ ${missingFromAdminPortal.length} IDs are MISSING from Admin Portal`);
      if (missingFromAdminPortal.length <= 10) {
        console.log(`  Missing IDs:`, missingFromAdminPortal);
      }
    }

    // Database consistency check
    testResults.databaseConsistency = {
      apiCount: totalSuccessful,
      adminPortalCount: foundInAdminPortal.length,
      match: totalSuccessful === foundInAdminPortal.length,
      discrepancy: Math.abs(totalSuccessful - foundInAdminPortal.length),
      missingRecords: missingFromAdminPortal.length
    };

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              DATABASE CONSISTENCY CHECK                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`API Reported Success:     ${testResults.databaseConsistency.apiCount}`);
    console.log(`Admin Portal Retrieved:   ${testResults.databaseConsistency.adminPortalCount}`);
    console.log(`Match:                    ${testResults.databaseConsistency.match ? '✓ YES' : '✗ NO'}`);
    if (!testResults.databaseConsistency.match) {
      console.log(`Discrepancy:              ${testResults.databaseConsistency.discrepancy} records`);
      testResults.errors.push('Database consistency mismatch detected');
    }

    // Save results
    const resultsFile = path.join(OUTPUT_DIR, `load-test-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
    console.log(`\n✓ Results saved to: ${resultsFile}`);

    // Final verdict
    const isReady = testResults.databaseConsistency.match &&
                    totalSuccessful === totalSubmitted &&
                    testResults.summary.duplicateCount === 0;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log(`║  VERDICT: ${isReady ? 'READY FOR 300–400 STUDENTS' : 'NOT READY'}${' '.repeat(isReady ? 15 : 20)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝');

    if (!isReady) {
      console.log('\nIssues identified:');
      if (!testResults.databaseConsistency.match) {
        console.log(`- Database consistency: ${testResults.databaseConsistency.discrepancy} records missing`);
      }
      if (totalFailed > 0) {
        console.log(`- Failed submissions: ${totalFailed} records`);
      }
      if (testResults.summary.duplicateCount > 0) {
        console.log(`- Duplicate records: ${testResults.summary.duplicateCount}`);
      }
    }

    process.exit(isReady ? 0 : 1);

  } catch (err) {
    console.error('\n✗ FATAL ERROR:', err.message);
    testResults.errors.push(err.message);
    const resultsFile = path.join(OUTPUT_DIR, `load-test-error-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
    process.exit(1);
  }
}

runLoadTest();
