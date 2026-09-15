import { db } from '@/lib/db';
import { triggerEventReminder } from './automations';
import { normalizeEmail } from './validation';
import { parseEventDateTimeToMs } from '@/lib/eventDateUtils';

export interface ScheduledReminderRunResult {
  eventsProcessed: number;
  remindersSent: number;
  errors: string[];
  timestamp: string;
}

/**
 * Server-side scheduled reminder job runner.
 * Idempotent: verifies db.emailLogs to guarantee no duplicate reminders are ever sent.
 */
export async function runScheduledEmailReminders(): Promise<ScheduledReminderRunResult> {
  const result: ScheduledReminderRunResult = {
    eventsProcessed: 0,
    remindersSent: 0,
    errors: [],
    timestamp: new Date().toISOString()
  };

  try {
    const events = await db.events.getAll();
    const publishedEvents = events.filter((e: any) => e.status !== 'Draft' && e.status !== 'Unpublished' && e.status !== 'Cancelled');
    const allRegistrations = await db.eventRegistrations.getAll();
    const sentLogs = await db.emailLogs.getAll();

    const now = Date.now();

    for (const event of publishedEvents) {
      const eventStartMs = parseEventDateTimeToMs(event.date, event.time);
      if (!eventStartMs || isNaN(eventStartMs)) continue;

      const diffMs = eventStartMs - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // 1. 24-Hour Reminder Window (Between 23h and 25h before event)
      const is24hWindow = diffHours >= 23 && diffHours <= 25;

      // 2. 1-Hour Reminder Window (Between 0.5h and 1.5h before event)
      const is1hWindow = diffHours >= 0.5 && diffHours <= 1.5;

      if (is24hWindow || is1hWindow) {
        result.eventsProcessed++;
        const targetType = is24hWindow ? 'event_24h_reminder' : 'event_1h_reminder';
        const eventRegs = allRegistrations.filter((r: any) => r.eventId === event.id && r.status !== 'Cancelled' && r.status !== 'Rejected');

        for (const reg of eventRegs) {
          const recipientEmail = normalizeEmail(reg.email);
          if (!recipientEmail) continue;

          // Idempotency Check: Has this reminder type already been sent for this event to this recipient?
          const alreadySent = sentLogs.some(
            (log: any) =>
              log.type === targetType &&
              normalizeEmail(log.recipient) === recipientEmail &&
              (log.metadata?.eventId === event.id || log.subject?.includes(event.title))
          );

          if (!alreadySent) {
            try {
              await triggerEventReminder({
                studentName: reg.name || 'Student',
                email: recipientEmail,
                event: {
                  id: event.id,
                  title: event.title,
                  date: event.date,
                  time: event.time || 'TBA',
                  venue: event.venue || 'Chandigarh University'
                },
                type: targetType
              });
              result.remindersSent++;
            } catch (sendErr: any) {
              result.errors.push(`Failed to send ${targetType} to ${recipientEmail}: ${sendErr.message}`);
            }
          }
        }
      }
    }
  } catch (err: any) {
    result.errors.push(`Scheduled processing failure: ${err.message}`);
  }

  return result;
}
