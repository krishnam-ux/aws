import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const postgres = require('postgres');
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL not configured' });
    }
    const sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      connect_timeout: 10
    });
    const res = await sql`SELECT 1 as val`;
    await sql.end();
    return NextResponse.json({ success: true, result: res });
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message || String(err),
      stack: err.stack,
      name: err.name
    });
  }
}
