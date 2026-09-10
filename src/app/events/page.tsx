import { db } from '@/lib/db';
import EventsClient from './EventsClient';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  try {
    const events = await db.events.getAll();
    const registrations = await db.eventRegistrations.getAll();

    const publicEvents = events
      .filter(event => {
        const s = (event.status || '').toUpperCase();
        return s !== 'DRAFT' && s !== 'UNPUBLISHED' && s !== 'CANCELLED';
      })
      .map(event => {
        const count = registrations.filter(
          r => r.eventId === event.id && r.status !== 'Rejected' && r.status !== 'Cancelled'
        ).length;
        return {
          ...event,
          registrationCount: count
        };
      });

    return <EventsClient initialEvents={publicEvents} />;
  } catch (err) {
    console.error('Error rendering events page on server:', err);
    return <EventsClient initialEvents={[]} />;
  }
}
