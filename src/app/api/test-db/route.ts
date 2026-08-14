import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const events = await db.events.getAll();
    return NextResponse.json({ success: true, count: events.length, events });
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message || String(err),
      stack: err.stack,
      name: err.name
    });
  }
}
