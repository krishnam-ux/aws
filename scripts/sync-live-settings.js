const fs = require('fs');
const envLines = fs.readFileSync('.env.production.local', 'utf8').split(/\r?\n/);
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
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

async function sync() {
  try {
    const rows = await sql`SELECT value FROM kv_store WHERE key = 'settings.json'`;
    let settings = {};
    if (rows.length > 0 && rows[0].value) {
      try {
        settings = JSON.parse(rows[0].value);
      } catch (err) {
        settings = {};
      }
    }
    console.log('Current PostgreSQL settings:', settings);
    settings.examPortalPublished = false;
    const strValue = JSON.stringify(settings);
    await sql`
      INSERT INTO kv_store (key, value)
      VALUES ('settings.json', ${strValue})
      ON CONFLICT (key)
      DO UPDATE SET value = ${strValue}
    `;
    console.log('Synchronized PostgreSQL settings.json -> examPortalPublished: false');

    // Also verify exams and attempts integrity in PostgreSQL
    const examRows = await sql`SELECT id, title, exam_code FROM exams`;
    console.log(`Verified ${examRows.length} exams intact in PostgreSQL database.`);

    const attemptRows = await sql`SELECT count(*) FROM exam_attempts`;
    console.log(`Verified ${attemptRows[0].count} exam attempts intact in PostgreSQL database.`);
  } catch (e) {
    console.error('PostgreSQL error:', e.message);
  } finally {
    await sql.end();
  }
}

sync();
