import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const events = db.events.getAll();
    const registrations = db.eventRegistrations.getAll();

    const publicEvents = events
      .filter(event => event.status !== 'Draft' && event.status !== 'Unpublished')
      .map(event => {
        const count = registrations.filter(r => r.eventId === event.id && r.status !== 'Rejected' && r.status !== 'Cancelled').length;
        return {
          ...event,
          registrationCount: count
        };
      });

    return NextResponse.json(publicEvents);
  } catch (err) {
    console.error('API Events GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
