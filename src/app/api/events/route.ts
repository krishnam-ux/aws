import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const events = db.events.getAll();
    // Return all events that are not in Draft status for the public page
    const publicEvents = events.filter(event => event.status !== 'Draft');
    return NextResponse.json(publicEvents);
  } catch (err) {
    console.error('API Events GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
