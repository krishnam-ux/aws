const base = process.argv[2] || 'https://www.awssbgcuup.tech';
const username = 'awsadmin@culko.in';
const password = 'awssbgadmin123';
const resumeName = 'AWS-TEST-Resume-2026.pdf';
const resumeBytes = Buffer.from('%PDF-1.4\n% AWS Student Builder Group resume verification\n%%EOF\n');

async function postAdmin(token, body) {
  const response = await fetch(`${base}/api/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = { raw }; }
  return { response, data, raw };
}

async function login() {
  const result = await postAdmin(null, { action: 'login', username, password });
  if (!result.response.ok || !result.data?.token) throw new Error(`Admin login failed: ${result.raw}`);
  return result.data.token;
}

async function main() {
  let token;
  let opportunityId;
  try {
    token = await login();
    const stamp = Date.now();
    const create = await postAdmin(token, {
      action: 'create-career',
      career: {
        title: `RESUME TEST - Admin Access ${stamp}`,
        slug: `resume-test-admin-${stamp}`,
        organizationName: 'AWS Student Builder Group',
        organizationLogo: '', opportunityType: 'Internship', location: 'Remote', workMode: 'Remote',
        shortDescription: 'Clearly marked temporary resume verification opportunity.',
        description: 'Temporary test opportunity for private resume access verification.',
        responsibilities: 'Resume access verification', requiredSkills: 'Testing', preferredSkills: 'QA',
        eligibility: 'Open to all', benefits: 'Verification only', additionalInformation: 'DELETE AFTER TEST',
        applicationDeadline: new Date(Date.now() + 7 * 86400000).toISOString(), status: 'Open',
        published: true, internalApplications: true, applicationLink: '', maxApplications: 20,
      },
    });
    if (!create.response.ok || !create.data?.career?.id) throw new Error(`Opportunity creation failed: ${create.raw}`);
    const opportunity = create.data.career;
    opportunityId = opportunity.id;

    const email = `resume.test.${stamp}@example.com`;
    const form = new FormData();
    form.set('opportunityId', opportunity.id);
    form.set('opportunitySlug', opportunity.slug);
    form.set('name', 'RESUME TEST Student');
    form.set('email', email);
    form.set('phone', '9999999999');
    form.set('university', 'Test University');
    form.set('program', 'B.Tech CSE');
    form.set('graduationYear', '2028');
    form.set('studentId', `RESUME-TEST-${stamp}`);
    form.set('skills', 'Testing');
    form.set('motivation', 'Clearly marked resume access test.');
    form.set('consent', 'on');
    form.set('resume', new Blob([resumeBytes], { type: 'application/pdf' }), resumeName);

    const submission = await fetch(`${base}/api/career-applications`, { method: 'POST', body: form, redirect: 'manual' });
    const location = submission.headers.get('location');
    if (submission.status !== 307 || !location?.startsWith(`${base}/`) || location.includes('localhost')) {
      throw new Error(`Unexpected submission response: ${submission.status} ${location}`);
    }

    const applications = await postAdmin(token, { action: 'get-career-applications', opportunityId });
    const application = applications.data?.find((item) => item.email === email);
    if (!application?.resumeUrl) throw new Error(`Admin record has no resume reference: ${applications.raw}`);

    const unauthorized = await fetch(`${base}/api/admin/career-applications/${application.id}/resume`);
    if (unauthorized.status !== 401) throw new Error(`Unauthorized resume request returned ${unauthorized.status}`);

    const view = await fetch(`${base}/api/admin/career-applications/${application.id}/resume`, { headers: { Authorization: `Bearer ${token}` } });
    const viewBytes = Buffer.from(await view.arrayBuffer());
    if (view.status !== 200 || view.headers.get('content-type') !== 'application/pdf' || !view.headers.get('content-disposition')?.includes(`inline; filename="${resumeName}"`) || !viewBytes.equals(resumeBytes)) {
      throw new Error(`View response mismatch: ${view.status}, ${view.headers.get('content-disposition')}, ${viewBytes.length} bytes`);
    }

    const download = await fetch(`${base}/api/admin/career-applications/${application.id}/resume?download=1`, { headers: { Authorization: `Bearer ${token}` } });
    const downloadBytes = Buffer.from(await download.arrayBuffer());
    if (download.status !== 200 || !download.headers.get('content-disposition')?.includes(`attachment; filename="${resumeName}"`) || !downloadBytes.equals(resumeBytes)) {
      throw new Error(`Download response mismatch: ${download.status}, ${download.headers.get('content-disposition')}, ${downloadBytes.length} bytes`);
    }

    const relogin = await login();
    const refreshed = await postAdmin(relogin, { action: 'get-career-applications', opportunityId });
    const refreshedApplication = refreshed.data?.find((item) => item.id === application.id);
    if (!refreshedApplication?.resumeUrl) throw new Error('Resume reference missing after Admin re-login/refresh fetch.');

    console.log(JSON.stringify({
      pass: true,
      opportunityId,
      applicationId: application.id,
      location,
      unauthorizedStatus: unauthorized.status,
      view: { status: view.status, contentType: view.headers.get('content-type'), disposition: view.headers.get('content-disposition'), bytes: viewBytes.length },
      download: { status: download.status, disposition: download.headers.get('content-disposition'), bytes: downloadBytes.length },
      persistenceAfterRelogin: true,
    }, null, 2));
  } finally {
    if (token && opportunityId) {
      const cleanup = await postAdmin(token, { action: 'delete-career', id: opportunityId });
      console.log(JSON.stringify({ cleanup: cleanup.response.status, opportunityId }, null, 2));
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ pass: false, error: String(error) }, null, 2));
  process.exitCode = 1;
});
