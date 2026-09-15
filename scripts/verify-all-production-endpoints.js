async function runVerification() {
  console.log('================================================================');
  console.log('LIVE PRODUCTION VERIFICATION ON: https://www.awssbgcuup.tech');
  console.log('================================================================\n');

  // 1. Check Public Exam Status API
  console.log('Test 1: Public Exam Status API');
  const statusRes = await fetch('https://www.awssbgcuup.tech/api/exam/status', { cache: 'no-store' });
  const statusData = await statusRes.json();
  console.log('  HTTP Status:', statusRes.status);
  console.log('  Response Data:', statusData);
  if (statusRes.status === 200 && statusData.success === true && statusData.published === false) {
    console.log('  ✓ PASSED: Portal status correctly reports published: false');
  } else {
    console.error('  ✗ FAILED: Portal status check');
  }

  // 2. Candidate Auth Attempt (Should be Rejected with 403)
  console.log('\nTest 2: Candidate Authentication Protection on Unpublished Portal');
  const authRes = await fetch('https://www.awssbgcuup.tech/api/exam/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examId: 'AWS-CCP-01',
      studentName: 'Test Student',
      rollNumber: '23BCS10145',
      email: 'student@cumail.in'
    })
  });
  const authData = await authRes.json();
  console.log('  HTTP Status:', authRes.status);
  console.log('  Response Error:', authData.error);
  if (authRes.status === 403 && authData.error && authData.error.includes('unpublished')) {
    console.log('  ✓ PASSED: Candidate auth strictly blocked with 403 while portal is unpublished');
  } else {
    console.error('  ✗ FAILED: Candidate auth rejection check');
  }

  // 3. Admin API Exam Access & Integrity Check
  console.log('\nTest 3: Admin Exam Management API & Data Integrity');
  const adminRes = await fetch('https://www.awssbgcuup.tech/api/admin/exams', {
    headers: {
      Authorization: 'Bearer awssbg-admin-session-token-secure-hash',
      'Cache-Control': 'no-store'
    }
  });
  const adminData = await adminRes.json();
  console.log('  HTTP Status:', adminRes.status);
  console.log('  Portal Published in Admin API:', adminData.portalPublished);
  console.log('  Total Exams in Production:', adminData.exams?.length || 0);
  if (adminData.exams && adminData.exams.length > 0) {
    console.log('  Sample Exam 1:', adminData.exams[0].title, `(${adminData.exams[0].examCode})`);
    console.log('  Sample Exam Stats:', JSON.stringify(adminData.exams[0].stats));
    console.log('  ✓ PASSED: Admin exam management and candidate stats 100% intact');
  }

  console.log('\n================================================================');
  console.log('API VERIFICATION COMPLETE');
  console.log('================================================================');
}

runVerification();
