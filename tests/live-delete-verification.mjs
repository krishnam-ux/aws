import crypto from 'node:crypto';

const baseUrl = 'https://www.awssbgcuup.tech';
const username = 'awsadmin@culko.in';
const password = 'awssbgadmin123';

function buildSlug() {
  return `live-delete-test-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
}

async function postAdmin(token, body) {
  const res = await fetch(`${baseUrl}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { status: res.status, ok: res.ok, data, headers: res.headers, raw: text };
}

async function login() {
  const result = await postAdmin(null, { action: 'login', username, password });
  if (!result.ok || !result.data?.token) {
    throw new Error(`Admin login failed (${result.status}): ${JSON.stringify(result.data)}`);
  }
  return result.data.token;
}

async function submitApplication(opportunity) {
  const studentLabel = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `live.delete.test.${studentLabel}@example.com`;
  const form = new FormData();
  form.set('opportunityId', opportunity.id);
  form.set('opportunitySlug', opportunity.slug);
  form.set('name', `Live Delete Test Student ${studentLabel}`);
  form.set('email', email);
  form.set('phone', '9999999999');
  form.set('university', 'Test University');
  form.set('program', 'B.Tech CSE');
  form.set('graduationYear', '2028');
  form.set('studentId', `SID-${studentLabel}`);
  form.set('linkedin', 'https://linkedin.com/in/test-student');
  form.set('github', 'https://github.com/test-student');
  form.set('portfolio', 'https://example.com/portfolio');
  form.set('skills', 'React, Testing');
  form.set('experience', 'Live deletion verification.');
  form.set('motivation', 'To verify deletion logic on live site.');
  form.set('additionalInformation', 'DELETE AFTER TEST.');
  form.set('consent', 'on');

  // Attach a dummy pdf file for resume
  const pdfBlob = new Blob(['%PDF-1.4 dummy pdf content'], { type: 'application/pdf' });
  form.set('resume', pdfBlob, 'test-resume.pdf');

  const res = await fetch(`${baseUrl}/api/career-applications`, {
    method: 'POST',
    body: form,
    redirect: 'manual'
  });

  if (![302, 303, 307].includes(res.status)) {
    const text = await res.text();
    throw new Error(`Application submit failed (${res.status}): ${text}`);
  }

  const location = res.headers.get('location');
  if (!location) {
    throw new Error(`Application redirect header missing`);
  }

  return { email, location };
}

async function run() {
  console.log('--- STARTING LIVE PRODUCTION VERIFICATION ---');
  const slug = buildSlug();
  let createdOpportunityId = null;

  const token = await login();
  console.log('1. Admin login: SUCCESS');

  // Create temporary opportunity
  const createPayload = {
    action: 'create-career',
    career: {
      title: `Live Delete Temp Opportunity ${Date.now()}`,
      slug,
      organizationName: 'AWS Student Builder Group',
      organizationLogo: '',
      opportunityType: 'Internship',
      location: 'Remote',
      workMode: 'Remote',
      shortDescription: 'Temporary live verification opportunity.',
      description: 'Temporary live verification opportunity.',
      responsibilities: 'Verify deletion flow',
      requiredSkills: 'Testing',
      preferredSkills: 'QA',
      eligibility: 'Open to all',
      benefits: 'Verification only',
      additionalInformation: 'DELETE AFTER TEST',
      applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Open',
      published: true,
      internalApplications: true,
      applicationLink: '',
      maxApplications: 20
    }
  };

  const createResult = await postAdmin(token, createPayload);
  if (!createResult.ok || !createResult.data?.career?.id) {
    throw new Error(`create-career failed (${createResult.status}): ${JSON.stringify(createResult.data)}`);
  }

  const opportunity = createResult.data.career;
  createdOpportunityId = opportunity.id;
  console.log(`2. Created temporary opportunity: ${createdOpportunityId} (${opportunity.slug})`);

  // Submit test application with resume
  const { email } = await submitApplication(opportunity);
  console.log(`3. Submitted test application for: ${email}`);

  // Fetch applications list to verify registration and get application ID
  const listBefore = await postAdmin(token, { action: 'get-career-applications', opportunityId: opportunity.id });
  if (!listBefore.ok || !Array.isArray(listBefore.data)) {
    throw new Error(`get-career-applications failed: ${JSON.stringify(listBefore.data)}`);
  }

  const testApp = listBefore.data.find((app) => String(app.email || '').toLowerCase() === email.toLowerCase());
  if (!testApp) {
    throw new Error('Test application not found in first fetch.');
  }
  const applicationId = testApp.id;
  console.log(`4. Application found in list. ID: ${applicationId}, Count: ${listBefore.data.length}`);

  // Verify resume file is accessible via resume endpoint
  const resumeResBefore = await fetch(`${baseUrl}/api/admin/career-applications/${applicationId}/resume`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (resumeResBefore.status !== 200) {
    throw new Error(`Resume before delete check returned status ${resumeResBefore.status}`);
  }
  console.log('5. Resume file is accessible: SUCCESS');

  // Verify CSV export contains the applicant
  const csvBefore = await postAdmin(token, { action: 'export-career-applications-csv', opportunityId: opportunity.id });
  if (!csvBefore.ok || !csvBefore.raw.includes(email)) {
    throw new Error('CSV before delete check did not contain the test email.');
  }
  console.log('6. CSV export contains applicant: YES');

  // Perform deletion of the test application
  console.log('7. Triggering deletion via delete-career-application action...');
  const deleteAppRes = await postAdmin(token, { action: 'delete-career-application', id: applicationId });
  if (!deleteAppRes.ok || !deleteAppRes.data?.success) {
    throw new Error(`Delete application failed: ${JSON.stringify(deleteAppRes.data)}`);
  }
  console.log('8. Application deletion API call: SUCCESS');

  // Verify application is immediately removed from list
  const listAfter = await postAdmin(token, { action: 'get-career-applications', opportunityId: opportunity.id });
  const testAppAfter = listAfter.data?.find((app) => app.id === applicationId);
  if (testAppAfter) {
    throw new Error('Test application is still present in the list after deletion!');
  }
  console.log(`9. Application removed from list immediately. New Count: ${listAfter.data?.length}`);

  // Re-login and fetch again to verify persistence of deletion
  const freshToken = await login();
  const listFresh = await postAdmin(freshToken, { action: 'get-career-applications', opportunityId: opportunity.id });
  if (listFresh.data?.some((app) => app.id === applicationId)) {
    throw new Error('Test application is still present after re-login/fresh fetch!');
  }
  console.log('10. Deletion persistence verified after re-login: SUCCESS');

  // Verify CSV no longer contains the deleted student
  const csvAfter = await postAdmin(freshToken, { action: 'export-career-applications-csv', opportunityId: opportunity.id });
  if (csvAfter.ok && csvAfter.raw.includes(email)) {
    throw new Error('CSV export still contains the deleted applicant!');
  }
  console.log('11. CSV export does not contain deleted applicant: YES');

  // Verify resume file is no longer accessible (should return 404)
  const resumeResAfter = await fetch(`${baseUrl}/api/admin/career-applications/${applicationId}/resume`, {
    headers: { Authorization: `Bearer ${freshToken}` }
  });
  if (resumeResAfter.status !== 404) {
    throw new Error(`Resume after delete check returned status ${resumeResAfter.status} instead of 404`);
  }
  console.log('12. Resume file cleaned up (returns 404): YES');

  // Cleanup: Delete temporary opportunity
  const deleteOpResult = await postAdmin(freshToken, { action: 'delete-career', id: opportunity.id });
  if (!deleteOpResult.ok) {
    console.warn(`WARNING: Failed to cleanup temporary opportunity: ${opportunity.id}`);
  } else {
    console.log('13. Cleanup temporary opportunity: SUCCESS');
  }

  console.log('\n--- LIVE PRODUCTION VERIFICATION COMPLETE: ALL PASSED ---');
}

run().catch((err) => {
  console.error('\nLIVE PRODUCTION VERIFICATION FAILED:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
