const base='https://www.awssbgcuup.tech';
const username='awsadmin@culko.in';
const password='awssbgadmin123';
async function call(token, body){const r=await fetch(`${base}/api/admin`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data={raw}}return {r,data};}
const login=await call(null,{action:'login',username,password});
const token=login.data.token;
const list=await call(token,{action:'get-career-applications',opportunityId:'career-1787081821603'});
const app=list.data.find(x=>x.email==='browser.resume.test.178708@example.com');
if(!app) throw new Error('browser test application not found');
const unauth=await fetch(`${base}/api/admin/career-applications/${app.id}/resume`);
const view=await fetch(`${base}/api/admin/career-applications/${app.id}/resume`,{headers:{Authorization:`Bearer ${token}`}});
const viewBytes=Buffer.from(await view.arrayBuffer());
const download=await fetch(`${base}/api/admin/career-applications/${app.id}/resume?download=1`,{headers:{Authorization:`Bearer ${token}`}});
const downloadBytes=Buffer.from(await download.arrayBuffer());
const expected=Buffer.from('%PDF-1.4\n% AWS Student Builder Group BROWSER RESUME TEST\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
console.log(JSON.stringify({applicationId:app.id,resumeReference:app.resumeUrl,unauthorizedStatus:unauth.status,viewStatus:view.status,viewType:view.headers.get('content-type'),viewDisposition:view.headers.get('content-disposition'),viewBytes:viewBytes.length,viewExact:viewBytes.equals(expected),downloadStatus:download.status,downloadDisposition:download.headers.get('content-disposition'),downloadBytes:downloadBytes.length,downloadExact:downloadBytes.equals(expected)},null,2));
