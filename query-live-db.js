const fs = require('fs');
const envLines = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/);
for (const line of envLines) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx > -1) {
    const key = line.slice(0, idx);
    const value = line.slice(idx + 1).trim();
    if (value && !value.startsWith('[')) process.env[key] = value;
  }
}

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, idle_timeout: 20, connect_timeout: 30 });

(async () => {
  const rows = await sql`SELECT id, event_id, name, email, status, attendance, created_at FROM registrations ORDER BY created_at DESC LIMIT 50`;
  console.log(JSON.stringify(rows.map(r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    event_id: r.event_id,
    status: r.status,
    attendance: r.attendance,
    created_at: r.created_at
  })), null, 2));
  await sql.end();
})();
