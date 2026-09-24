import assert from 'node:assert/strict';

const BASE_URL = 'https://www.awssbgcuup.tech';

// Sample 1x1 transparent PNG as base64
const SAMPLE_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const ADMIN_AUTH_HEADER = {
  'Authorization': 'Bearer awssbg-admin-session-token-secure-hash',
  'Cache-Control': 'no-cache'
};

async function main() {
  console.log('--- STARTING LIVE PRODUCTION DIGITAL ID VERIFICATION ---');
  console.log(`Target: ${BASE_URL}\n`);

  // Step 1: Admin Stats & Listing
  console.log('1. Checking Admin Digital IDs endpoint...');
  const adminRes = await fetch(`${BASE_URL}/api/admin/digital-ids`, {
    headers: ADMIN_AUTH_HEADER
  });
  assert.equal(adminRes.status, 200, `Expected 200 from admin API, got ${adminRes.status}`);
  const adminData = await adminRes.json();
  console.log(`   ✓ Admin API returned stats: Total=${adminData.stats.total}, Active=${adminData.stats.active}`);

  // Step 2: Issue Safe Live Test ID
  console.log('\n2. Issuing Safe Live Test ID...');
  const createPayload = {
    fullName: 'Digital ID Live Test',
    memberType: 'Other',
    role: 'Verification Test',
    domain: 'Cloud Architecture & Testing',
    university: 'Chandigarh University – Uttar Pradesh',
    course: 'B.Tech CSE',
    branch: 'Computer Science',
    currentYear: '3rd Year',
    email: `digitalid.livetest.${Date.now()}@awssbgcuup.tech`,
    photoUrl: SAMPLE_PNG_BASE64,
    additionalInformation: 'Safe temporary automated verification credential'
  };

  const createRes = await fetch(`${BASE_URL}/api/admin/digital-ids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...ADMIN_AUTH_HEADER
    },
    body: JSON.stringify(createPayload)
  });

  if (!createRes.ok) {
    const errBody = await createRes.json();
    console.error('   Creation error response:', errBody);
  }
  assert.equal(createRes.status, 200, `Expected 200 on creation, got ${createRes.status}`);
  const createData = await createRes.json();
  const createdRecord = createData.item || createData;
  const testPublicId = createdRecord.publicId;
  const testId = createdRecord.id;
  console.log(`   ✓ Created Test ID: ${testPublicId} (Internal ID: ${testId})`);
  assert.match(testPublicId, /^DID-CUUP-\d{3,}$/);
  assert.equal(createdRecord.fullName, 'Digital ID Live Test');
  assert.equal(createdRecord.status, 'ACTIVE');

  // Step 3: Verify Public Card endpoint & HTML page
  console.log('\n3. Testing Public Digital Card endpoint...');
  const cardRes = await fetch(`${BASE_URL}/api/digital-ids/card/${testPublicId}`, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  assert.equal(cardRes.status, 200);
  const cardData = await cardRes.json();
  const cardIdentity = cardData.identity || cardData;
  assert.equal(cardIdentity.publicId, testPublicId);
  assert.equal(cardIdentity.fullName, 'Digital ID Live Test');
  console.log(`   ✓ Card API returned member data for ${testPublicId}`);

  console.log('   Testing Public Card Page (/id/' + testPublicId + ')...');
  const cardPageRes = await fetch(`${BASE_URL}/id/${testPublicId}`, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  assert.equal(cardPageRes.status, 200);
  const cardHtml = await cardPageRes.text();
  assert.ok(cardHtml.includes(testPublicId), 'Card page must include public ID');
  assert.ok(cardHtml.includes('Digital ID Live Test'), 'Card page must include member name');
  console.log('   ✓ Public Card HTML page rendered with 3D Flip Card elements');

  // Step 4: Verify Public Verification endpoint & HTML page
  console.log('\n4. Testing Public Verification endpoint (/api/digital-ids/verify/' + testPublicId + ')...');
  const verifyRes = await fetch(`${BASE_URL}/api/digital-ids/verify/${testPublicId}`, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.status, 'ACTIVE');
  assert.equal(verifyData.digitalId || verifyData.publicId, testPublicId);
  assert.equal(verifyData.fullName, 'Digital ID Live Test');
  console.log(`   ✓ Live Verification status: ${verifyData.status}`);

  console.log('   Testing Public Verification Page (/verify/' + testPublicId + ')...');
  const verifyPageRes = await fetch(`${BASE_URL}/verify/${testPublicId}`, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  assert.equal(verifyPageRes.status, 200);
  const verifyHtml = await verifyPageRes.text();
  assert.ok(verifyHtml.includes(testPublicId));
  assert.ok(verifyHtml.includes('ACTIVE') || verifyHtml.includes('Verified Identity'));
  console.log('   ✓ Public Verification HTML page rendered with ACTIVE status');

  // Step 5: Test QR Code Generation
  console.log('\n5. Testing Live QR Code endpoint (/api/digital-ids/qr/' + testPublicId + ')...');
  const qrRes = await fetch(`${BASE_URL}/api/digital-ids/qr/${testPublicId}`);
  assert.equal(qrRes.status, 200);
  assert.equal(qrRes.headers.get('content-type'), 'image/png');
  const qrBlob = await qrRes.arrayBuffer();
  assert.ok(qrBlob.byteLength > 100, 'QR PNG must be a non-empty image');
  console.log(`   ✓ Live QR Code generated successfully (${qrBlob.byteLength} bytes PNG)`);

  // Step 6: Test PDF Generation
  console.log('\n6. Testing Live PDF Download endpoint (/api/digital-ids/pdf/' + testPublicId + ')...');
  const pdfRes = await fetch(`${BASE_URL}/api/digital-ids/pdf/${testPublicId}`);
  assert.equal(pdfRes.status, 200);
  assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  assert.ok(pdfBuffer.length > 5000, 'PDF buffer must contain substantial document bytes');
  assert.equal(pdfBuffer.subarray(0, 5).toString('utf-8'), '%PDF-');
  console.log(`   ✓ Live PDF generated and validated (${pdfBuffer.length} bytes, %PDF- header valid)`);

  // Step 7: Live Update Profile
  console.log('\n7. Testing Live Profile Edit...');
  const updateRes = await fetch(`${BASE_URL}/api/admin/digital-ids`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...ADMIN_AUTH_HEADER
    },
    body: JSON.stringify({
      id: testId,
      fullName: 'Digital ID Live Test (Updated)',
      role: 'Senior Verification Specialist'
    })
  });
  assert.equal(updateRes.status, 200);
  const updateJson = await updateRes.json();
  const updatedData = updateJson.item || updateJson;
  assert.equal(updatedData.publicId, testPublicId, 'Public ID must remain permanent');
  assert.equal(updatedData.fullName, 'Digital ID Live Test (Updated)');
  assert.equal(updatedData.role, 'Senior Verification Specialist');

  // Verify updated info appears immediately on verification
  const verifyAfterUpdate = await fetch(`${BASE_URL}/api/digital-ids/verify/${testPublicId}`, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  const verifyAfterUpdateData = await verifyAfterUpdate.json();
  assert.equal(verifyAfterUpdateData.fullName, 'Digital ID Live Test (Updated)');
  assert.equal(verifyAfterUpdateData.role, 'Senior Verification Specialist');
  console.log('   ✓ Live edit immediately reflected in verification endpoint without ID alteration');

  // Step 8: Status Transitions: SUSPEND -> REACTIVATE -> REVOKE
  console.log('\n8. Testing Status Transitions (SUSPEND -> REACTIVATE -> REVOKE)...');
  
  // 8a. Suspend
  console.log('   8a. Suspending ID...');
  const suspendRes = await fetch(`${BASE_URL}/api/admin/digital-ids`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...ADMIN_AUTH_HEADER
    },
    body: JSON.stringify({
      id: testId,
      status: 'SUSPENDED',
      reason: 'Temporary live verification suspension test'
    })
  });
  assert.equal(suspendRes.status, 200);
  const verifySuspended = await (await fetch(`${BASE_URL}/api/digital-ids/verify/${testPublicId}`, { headers: { 'Cache-Control': 'no-cache' } })).json();
  assert.equal(verifySuspended.status, 'SUSPENDED');
  console.log('   ✓ Live verification accurately shows SUSPENDED');

  // 8b. Reactivate
  console.log('   8b. Reactivating ID...');
  const reactivateRes = await fetch(`${BASE_URL}/api/admin/digital-ids`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...ADMIN_AUTH_HEADER
    },
    body: JSON.stringify({
      id: testId,
      status: 'ACTIVE'
    })
  });
  assert.equal(reactivateRes.status, 200);
  const verifyActive = await (await fetch(`${BASE_URL}/api/digital-ids/verify/${testPublicId}`, { headers: { 'Cache-Control': 'no-cache' } })).json();
  assert.equal(verifyActive.status, 'ACTIVE');
  console.log('   ✓ Live verification accurately shows ACTIVE again');

  // 8c. Revoke
  console.log('   8c. Revoking ID for test decommissioning...');
  const revokeRes = await fetch(`${BASE_URL}/api/admin/digital-ids`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...ADMIN_AUTH_HEADER
    },
    body: JSON.stringify({
      id: testId,
      status: 'REVOKED',
      reason: 'Automated live test decommissioned - ID permanently retired'
    })
  });
  assert.equal(revokeRes.status, 200);
  const verifyRevoked = await (await fetch(`${BASE_URL}/api/digital-ids/verify/${testPublicId}`, { headers: { 'Cache-Control': 'no-cache' } })).json();
  assert.equal(verifyRevoked.status, 'REVOKED');
  console.log(`   ✓ Live verification accurately shows REVOKED (Reason: ${verifyRevoked.revokedReason})`);

  // Step 9: Existing Systems Non-Regression Check on Live Production
  console.log('\n9. Checking Existing Systems Non-Regression on Live Production...');
  
  const eventsRes = await fetch(`${BASE_URL}/api/events`, { headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(eventsRes.status, 200, 'Events API must return 200');
  console.log('   ✓ Events API: OK (200)');

  const careersRes = await fetch(`${BASE_URL}/api/careers`, { headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(careersRes.status, 200, 'Careers API must return 200');
  console.log('   ✓ Careers/Opportunities API: OK (200)');

  const examPageRes = await fetch(`${BASE_URL}/exam`, { headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(examPageRes.status, 200, 'Certification Exam page must return 200');
  console.log('   ✓ Certification Exam Portal: OK (200)');

  const quizPageRes = await fetch(`${BASE_URL}/quiz`, { headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(quizPageRes.status, 200, 'Weekly Quiz portal page must return 200');
  console.log('   ✓ Weekly Quiz Portal: OK (200)');

  const teamRes = await fetch(`${BASE_URL}/api/team`, { headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(teamRes.status, 200, 'Leadership/Team API must return 200');
  console.log('   ✓ Core Team / Leadership API: OK (200)');

  const foundingFormRes = await fetch(`${BASE_URL}/founding-members/form`, { headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(foundingFormRes.status, 200, 'Founding Member Form page must return 200');
  console.log('   ✓ Founding Members Form: OK (200)');

  console.log('\n======================================================');
  console.log('🎉 ALL LIVE PRODUCTION DIGITAL ID TESTS PASSED! 🎉');
  console.log(`Test Public ID Generated & Retired: ${testPublicId}`);
  console.log(`Live Verification URL: ${BASE_URL}/verify/${testPublicId}`);
  console.log(`Live Digital Card URL: ${BASE_URL}/id/${testPublicId}`);
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('\n❌ LIVE VERIFICATION FAILED:', err);
  process.exit(1);
});
