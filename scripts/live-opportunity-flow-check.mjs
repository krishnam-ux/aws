import crypto from 'node:crypto';

const base = 'https://www.awssbgcuup.tech';
const adminUsername = 'awsadmin@culko.in';
const adminPassword = 'awssbgadmin123';

async function postAdmin(token, body) {
  const res = await fetch(`${base}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data, raw: text };
}

async function login() {
  const result = await postAdmin(null, { action: 'login', username: adminUsername, password: adminPassword });
  if (!result.ok || !result.data?.token) {
    throw new Error(`Admin login failed (${result.status}): ${JSON.stringify(result.data)}`);
  }
  return result.data.token;
}

async function findLiveOpportunity(token, title) {
  const listResult = await postAdmin(token, { action: 'get-careers' });
  if (!listResult.ok || !Array.isArray(listResult.data)) {
    throw new Error(`get-careers failed (${listResult.status}): ${JSON.stringify(listResult.data)}`);
  }
  const opportunity = listResult.data.find((item) => item.title === title);
  if (!opportunity) {
    throw new Error(`Created opportunity not found by title: ${title}`);
  }
  return opportunity;
}

async function submitApplication(opportunity, email, name = 'Live Flow Student') {
  const form = new FormData();
  form.set('opportunityId', opportunity.id);
  form.set('opportunitySlug', opportunity.slug);
  form.set('name', name);
  form.set('email', email);
  form.set('phone', '9999999999');
  form.set('university', 'Live Production University');
  form.set('program', 'B.Tech CSE');
  form.set('graduationYear', '2028');
  form.set('studentId', `LIVEFLOW-${Date.now()}`);
  form.set('linkedin', 'https://linkedin.com/in/live-flow-student');
  form.set('github', 'https://github.com/live-flow-student');
  form.set('portfolio', 'https://example.com/live-flow');
  form.set('skills', 'QA, React');
  form.set('experience', 'Student project work');
  form.set('motivation', 'Verify the live admin flow on the production site.');
  form.set('additionalInformation', 'Live verification run');
  form.set('consent', 'on');

  const res = await fetch(`${base}/api/career-applications`, {
    method: 'POST',
    body: form,
    redirect: 'manual'
  });

  const text = await res.text();
  if (![302, 303, 307].includes(res.status)) {
    throw new Error(`Application submit failed (${res.status}): ${text}`);
  }

  return { email };
}

async function main() {
  const token = await login();
  const title = `Live Flow Opportunity ${Date.now()}`;
  const slug = `live-flow-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

  const createResult = await postAdmin(token, {
    action: 'create-career',
    career: {
      title,
      slug,
      organizationName: 'AWS Student Builder Group',
      organizationLogo: '',
      opportunityType: 'Internship',
      location: 'Remote',
      workMode: 'Remote',
      shortDescription: 'Live production verification opportunity.',
      description: 'Live production verification opportunity.',
      responsibilities: 'Validate the opportunity registration flow',
      requiredSkills: 'QA',
      preferredSkills: '',
      eligibility: 'Open to all students',
      benefits: '',
      additionalInformation: '',
      applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Open',
      published: true,
      internalApplications: true,
      applicationLink: '',
      maxApplications: 20
    }
  });

  if (!createResult.ok || !createResult.data?.career?.id) {
    throw new Error(`create-career failed (${createResult.status}): ${JSON.stringify(createResult.data)}`);
  }

  const opportunity = createResult.data.career;
  const email = `liveflow.student.${Date.now()}@example.com`;
  await submitApplication(opportunity, email);

  const listResult = await postAdmin(token, { action: 'get-career-applications', opportunityId: opportunity.id });
  if (!listResult.ok || !Array.isArray(listResult.data)) {
    throw new Error(`get-career-applications failed (${listResult.status}): ${JSON.stringify(listResult.data)}`);
  }

  const registration = listResult.data.find((app) => String(app.email || '').toLowerCase() === email.toLowerCase());
  if (!registration) {
    throw new Error(`Submitted student missing from admin record: ${JSON.stringify(listResult.data)}`);
  }

  const searchTerm = 'liveflow.student';
  const filteredBySearch = listResult.data.filter((app) => {
    const haystack = `${app.name || ''} ${app.email || ''} ${app.university || ''} ${app.program || ''} ${app.studentId || ''}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  const csvResult = await postAdmin(token, { action: 'export-career-applications-csv', opportunityId: opportunity.id });
  if (!csvResult.ok) {
    throw new Error(`CSV export failed (${csvResult.status}): ${JSON.stringify(csvResult.data)}`);
  }

  const csvText = csvResult.raw;
  if (!csvText.toLowerCase().includes(email.toLowerCase())) {
    throw new Error('CSV export does not include the student email.');
  }

  const reloginToken = await login();
  const reloginResult = await postAdmin(reloginToken, { action: 'get-career-applications', opportunityId: opportunity.id });
  if (!reloginResult.ok || !Array.isArray(reloginResult.data)) {
    throw new Error(`re-login admin fetch failed (${reloginResult.status}): ${JSON.stringify(reloginResult.data)}`);
  }

  const reloginRegistration = reloginResult.data.find((app) => String(app.email || '').toLowerCase() === email.toLowerCase());
  if (!reloginRegistration) {
    throw new Error(`Student missing after logout/login: ${JSON.stringify(reloginResult.data)}`);
  }

  const summary = {
    passed: true,
    createOpportunity: true,
    opportunityId: opportunity.id,
    opportunitySlug: opportunity.slug,
    opportunityTitle: title,
    studentEmail: email,
    registrationVisible: true,
    registrationId: registration.id,
    searchMatches: filteredBySearch.length,
    csvExportIncludesEmail: csvText.toLowerCase().includes(email.toLowerCase()),
    csvRowCount: csvText.split('\n').length - 1,
    afterReloginVisible: true,
    afterReloginId: reloginRegistration.id,
    status: registration.status || 'New'
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ passed: false, error: String(error) }, null, 2));
  process.exit(1);
});
