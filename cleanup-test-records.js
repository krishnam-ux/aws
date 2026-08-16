#!/usr/bin/env node
/**
 * Clean up test records from database
 */

const https = require('https');

const ADMIN_URL = 'https://awscu.vercel.app/api/admin';
const ADMIN_TOKEN = 'awssbg-admin-session-token-secure-hash';

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
          resolve({ status: res.statusCode, body: parsed, raw });
        } catch (e) {
          resolve({ status: res.statusCode, body: raw, raw });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function cleanup() {
  console.log('Fetching all event registrations...');
  const regsRes = await httpJson(ADMIN_URL, { action: 'get-event-registrations' }, ADMIN_TOKEN);
  
  if (regsRes.status !== 200 || !Array.isArray(regsRes.body)) {
    throw new Error('Failed to fetch registrations');
  }

  const testRegs = regsRes.body.filter(r => r.name && r.name.includes('LOAD TEST - DO NOT KEEP'));
  console.log(`Found ${testRegs.length} test records to clean up`);

  let deleted = 0;
  for (const reg of testRegs) {
    try {
      const delRes = await httpJson(ADMIN_URL, {
        action: 'delete-event-registration',
        id: reg.id
      }, ADMIN_TOKEN);

      if (delRes.status === 200 && delRes.body?.success) {
        deleted++;
        if (deleted % 50 === 0) {
          console.log(`  Deleted ${deleted}/${testRegs.length}...`);
        }
      } else {
        console.error(`Failed to delete ${reg.id}:`, delRes.body);
      }
    } catch (err) {
      console.error(`Error deleting ${reg.id}:`, err.message);
    }
    
    // Small delay
    if (deleted % 10 === 0) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`\n✓ Successfully deleted ${deleted}/${testRegs.length} test records`);

  // Verify cleanup
  const verifyRes = await httpJson(ADMIN_URL, { action: 'get-event-registrations' }, ADMIN_TOKEN);
  const remainingTest = verifyRes.body.filter(r => r.name && r.name.includes('LOAD TEST - DO NOT KEEP'));
  console.log(`✓ Remaining test records: ${remainingTest.length}`);
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
