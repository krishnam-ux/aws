import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

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

const sql = postgres(env.DATABASE_URL, { ssl: 'require', max: 1, idle_timeout: 20, connect_timeout: 30 });

async function main() {
  console.log('Connecting to live DB:', env.DATABASE_URL ? 'URL Present' : 'Missing');
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
  console.log('Tables in DB:', tables.map(t => t.table_name));

  const hasQuizTable = tables.some(t => t.table_name === 'weekly_quizzes');
  if (hasQuizTable) {
    const quizzes = await sql`SELECT id, title, status, session_id, scheduled_date, start_time, end_time, scheduled_start_at, scheduled_end_at, duration_minutes, total_questions_to_select FROM weekly_quizzes`;
    console.log('Quizzes count:', quizzes.length);
    console.log('Quizzes:', JSON.stringify(quizzes, null, 2));
  } else {
    console.log('weekly_quizzes table does not exist!');
  }

  const hasEventsTable = tables.some(t => t.table_name === 'events');
  if (hasEventsTable) {
    const events = await sql`SELECT id, title, event_number, date, status FROM events`;
    console.log('Events in DB:', JSON.stringify(events, null, 2));
  }

  const hasRegsTable = tables.some(t => t.table_name === 'registrations');
  if (hasRegsTable) {
    const regCount = await sql`SELECT COUNT(*)::int AS count FROM registrations`;
    console.log('Total registrations in DB:', regCount[0]?.count);
    const sampleRegs = await sql`SELECT id, event_id, name, email, status FROM registrations LIMIT 5`;
    console.log('Sample registrations:', JSON.stringify(sampleRegs, null, 2));
  }

  await sql.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
