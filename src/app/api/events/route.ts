import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const events = await db.events.getAll();
    const registrations = await db.eventRegistrations.getAll();

    const publicEvents = events
      .filter(event => {
        const s = (event.status || '').toUpperCase();
        return s !== 'DRAFT' && s !== 'UNPUBLISHED' && s !== 'CANCELLED';
      })
      .map(event => {
        const count = registrations.filter(r => r.eventId === event.id && r.status !== 'Rejected' && r.status !== 'Cancelled').length;
        return {
          ...event,
          registrationCount: event.attendees !== undefined ? event.attendees : count
        };
      });

    return new NextResponse(JSON.stringify(publicEvents), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
      }
    });
  } catch (err) {
    console.error('API Events GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
