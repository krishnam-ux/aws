const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.production.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx <= 0) continue;
  const key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const postgres = require('postgres');
const sql = postgres(env.DATABASE_URL, { ssl: 'require', max: 1, idle_timeout: 20, connect_timeout: 30 });

(async () => {
  const rows = await sql`SELECT id, event_id, name, email, status, attendance, created_at FROM registrations ORDER BY created_at DESC LIMIT 20`;
  const count = await sql`SELECT COUNT(*)::int AS count FROM registrations`;
  console.log(JSON.stringify({ rows, count: count[0] }, null, 2));
  await sql.end();
})();
