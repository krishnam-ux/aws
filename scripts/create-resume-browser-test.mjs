const base = 'https://www.awssbgcuup.tech';
const username = 'awsadmin@culko.in';
const password = 'awssbgadmin123';
async function call(token, body) {
  const response = await fetch(`${base}/api/admin`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const raw = await response.text();
  let data; try { data = JSON.parse(raw); } catch { data = { raw }; }
  return { response, data };
}
const login = await call(null, { action: 'login', username, password });
if (!login.data?.token) throw new Error('login failed');
const stamp = Date.now();
const result = await call(login.data.token, { action: 'create-career', career: {
  title: `BROWSER RESUME TEST ${stamp}`, slug: `browser-resume-test-${stamp}`, organizationName: 'AWS Student Builder Group', organizationLogo: '', opportunityType: 'Internship', location: 'Remote', workMode: 'Remote', shortDescription: 'Temporary marked browser resume test.', description: 'Temporary marked browser resume test.', responsibilities: 'Verify resume flow', requiredSkills: 'Testing', preferredSkills: 'QA', eligibility: 'Open', benefits: 'Verification', additionalInformation: 'DELETE AFTER TEST', applicationDeadline: new Date(Date.now() + 7 * 86400000).toISOString(), status: 'Open', published: true, internalApplications: true, applicationLink: '', maxApplications: 20
} });
if (!result.data?.career?.id) throw new Error('create failed');
console.log(JSON.stringify({ id: result.data.career.id, slug: result.data.career.slug }, null, 2));
