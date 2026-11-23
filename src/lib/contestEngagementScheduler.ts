import fs from 'fs';
import path from 'path';
import { CONTEST_CONFIG, getContestState } from '@/lib/contestConfig';
import { sendEmail } from '@/lib/email/service';
import { normalizeEmail } from '@/lib/email/validation';
import { CONTEST_ENGAGEMENT_TOPICS } from '@/lib/email/contestEngagementTemplates';

export interface ParticipantEngagementSchedule {
  id: string; // `ces-${registrationId}`
  registrationId: string;
  name: string;
  email: string;
  university?: string;
  registeredAt: string; // ISO
  lastSentAt: string | null;
  nextEligibleAt: string; // ISO
  sentTopicIds: string[];
  finalDayReminderSent: boolean;
  unsubscribed: boolean;
  status: 'ACTIVE' | 'COMPLETED' | 'UNSUBSCRIBED';
  logs: {
    topicId: string;
    sentAt: string;
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
    error?: string;
  }[];
}

const SCHEDULE_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'db', 'contest_email_schedules.json');

function ensureScheduleFile(): void {
  const dir = path.dirname(SCHEDULE_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(SCHEDULE_FILE_PATH)) {
    fs.writeFileSync(SCHEDULE_FILE_PATH, JSON.stringify([], null, 2), 'utf8');
  }
}

export function getAllEngagementSchedules(): ParticipantEngagementSchedule[] {
  ensureScheduleFile();
  try {
    const raw = fs.readFileSync(SCHEDULE_FILE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading contest email schedules:', err);
    return [];
  }
}

export function saveAllEngagementSchedules(schedules: ParticipantEngagementSchedule[]): void {
  ensureScheduleFile();
  try {
    fs.writeFileSync(SCHEDULE_FILE_PATH, JSON.stringify(schedules, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving contest email schedules:', err);
  }
}

/**
 * Returns a pseudo-random integer between min and max (inclusive).
 */
export function getRandomIntervalHours(minHours = 24, maxHours = 72): number {
  return Math.floor(Math.random() * (maxHours - minHours + 1)) + minHours;
}

/**
 * Initializes an engagement campaign schedule for a newly registered contest participant.
 */
export function scheduleEngagementForRegistration(params: {
  registrationId: string;
  name: string;
  email: string;
  university?: string;
  registeredAt?: string;
  nowOverride?: Date | string;
}): ParticipantEngagementSchedule {
  const normalized = normalizeEmail(params.email);
  const now = params.nowOverride ? new Date(params.nowOverride) : new Date();
  const registeredAtIso = params.registeredAt || now.toISOString();

  const all = getAllEngagementSchedules();
  const existing = all.find((s) => normalizeEmail(s.email) === normalized);
  if (existing) {
    return existing;
  }

  // Initial next eligible time: random 24 to 72 hours from registration (or launch date, whichever is later)
  const launchTimeMs = new Date(CONTEST_CONFIG.launchDateIso).getTime();
  const regTimeMs = now.getTime();
  const baseTimeMs = Math.max(launchTimeMs, regTimeMs);
  const intervalHours = getRandomIntervalHours(24, 72);
  const nextEligibleMs = baseTimeMs + intervalHours * 3600 * 1000;

  const newSchedule: ParticipantEngagementSchedule = {
    id: `ces-${params.registrationId}`,
    registrationId: params.registrationId,
    name: params.name,
    email: normalized,
    university: params.university || 'Chandigarh University – Uttar Pradesh',
    registeredAt: registeredAtIso,
    lastSentAt: null,
    nextEligibleAt: new Date(nextEligibleMs).toISOString(),
    sentTopicIds: [],
    finalDayReminderSent: false,
    unsubscribed: false,
    status: 'ACTIVE',
    logs: []
  };

  all.push(newSchedule);
  saveAllEngagementSchedules(all);
  return newSchedule;
}

/**
 * Unsubscribe a participant from contest engagement emails.
 */
export function unsubscribeParticipant(email: string): boolean {
  const normalized = normalizeEmail(email);
  const all = getAllEngagementSchedules();
  let found = false;

  for (const item of all) {
    if (normalizeEmail(item.email) === normalized) {
      item.unsubscribed = true;
      item.status = 'UNSUBSCRIBED';
      found = true;
    }
  }

  if (found) {
    saveAllEngagementSchedules(all);
  }
  return found;
}

export interface SchedulerRunSummary {
  success: boolean;
  processedCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  executionTimeIso: string;
  message: string;
}

// In-memory mutex to prevent concurrent runs
let isSchedulerRunning = false;

/**
 * Server-side cron job runner for contest engagement emails.
 * Strictly operates only between 24 November 2026 (9:00 AM IST) and 4 December 2026 (11:59 PM IST).
 */
export async function runContestEngagementScheduler(
  options: {
    overrideTime?: Date | string | null;
    forceSend?: boolean;
  } = {}
): Promise<SchedulerRunSummary> {
  if (isSchedulerRunning) {
    return {
      success: false,
      processedCount: 0,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: ['Scheduler is already running in another process'],
      executionTimeIso: new Date().toISOString(),
      message: 'Concurrent scheduler execution blocked by mutex.'
    };
  }

  isSchedulerRunning = true;

  try {
    const now = options.overrideTime ? new Date(options.overrideTime) : new Date();
    const contestState = getContestState(now);
    const nowMs = now.getTime();
    const launchMs = new Date(CONTEST_CONFIG.launchDateIso).getTime();
    const endMs = new Date(CONTEST_CONFIG.endDateIso).getTime();

    const summary: SchedulerRunSummary = {
      success: true,
      processedCount: 0,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      executionTimeIso: now.toISOString(),
      message: ''
    };

    // 1. Time boundary check: Do not send before 24 November 2026 9:00 AM IST
    if (nowMs < launchMs) {
      summary.message = `Contest has not launched yet. Engagement emails start on ${CONTEST_CONFIG.launchDateIstString}.`;
      return summary;
    }

    // 2. Time boundary check: Do not send after 4 December 2026 11:59 PM IST
    if (nowMs > endMs) {
      summary.message = `Contest officially concluded on 4 December 2026. Engagement campaign terminated.`;
      return summary;
    }

    // Determine if today is the Final Day (4 December 2026 in IST)
    // Convert to Asia/Kolkata date string YYYY-MM-DD
    const istDateString = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    const isFinalDay = istDateString === '2026-12-04';

    const schedules = getAllEngagementSchedules();
    summary.processedCount = schedules.length;

    const topicSequence = [
      'topic-explore-security-island',
      'topic-climb-leaderboard',
      'topic-top-5-prizes',
      'topic-security-challenges',
      'topic-keep-competing'
    ];

    for (const schedule of schedules) {
      // Skip if unsubscribed or marked completed
      if (schedule.unsubscribed || schedule.status === 'UNSUBSCRIBED') {
        summary.skippedCount++;
        continue;
      }

      // Rolling 24-hour rule: Never send more than one promotional email within any rolling 24-hour period
      if (schedule.lastSentAt) {
        const lastSentMs = new Date(schedule.lastSentAt).getTime();
        const diffHours = (nowMs - lastSentMs) / (1000 * 3600);
        if (diffHours < 24 && !options.forceSend) {
          summary.skippedCount++;
          continue;
        }
      }

      // Check case A: Final-Day Reminder (4 December 2026)
      if (isFinalDay && !schedule.finalDayReminderSent) {
        const finalTopic = CONTEST_ENGAGEMENT_TOPICS['topic-final-day-reminder'];
        const emailHtml = finalTopic.generateHtml({
          name: schedule.name,
          email: schedule.email,
          registrationId: schedule.registrationId
        });

        try {
          const sendRes = await sendEmail({
            to: schedule.email,
            recipientName: schedule.name,
            subject: finalTopic.subject,
            html: emailHtml,
            type: 'admin_custom_announcement',
            category: 'EVENTS',
            metadata: {
              contestEventId: CONTEST_CONFIG.eventId,
              topicId: finalTopic.id,
              isFinalDay: true
            }
          });

          if (sendRes.success) {
            schedule.finalDayReminderSent = true;
            schedule.lastSentAt = now.toISOString();
            schedule.logs.push({
              topicId: finalTopic.id,
              sentAt: now.toISOString(),
              status: 'SUCCESS'
            });
            summary.sentCount++;
          } else {
            summary.failedCount++;
            summary.errors.push(`Final day send error for ${schedule.email}: ${sendRes.error}`);
          }
        } catch (sendErr: any) {
          summary.failedCount++;
          summary.errors.push(`Final day exception for ${schedule.email}: ${sendErr.message}`);
        }
        continue;
      }

      // Check case B: Regular randomized engagement email (interval between 24 and 72 hours)
      const nextEligibleMs = new Date(schedule.nextEligibleAt).getTime();
      const isEligibleNow = nowMs >= nextEligibleMs || options.forceSend;

      if (!isEligibleNow) {
        summary.skippedCount++;
        continue;
      }

      // Find unsent topics for this participant
      const availableTopics = topicSequence.filter((id) => !schedule.sentTopicIds.includes(id));
      if (availableTopics.length === 0) {
        schedule.status = 'COMPLETED';
        summary.skippedCount++;
        continue;
      }

      // Pick next topic
      const topicId = availableTopics[0];
      const topic = CONTEST_ENGAGEMENT_TOPICS[topicId];
      if (!topic) continue;

      const emailHtml = topic.generateHtml({
        name: schedule.name,
        email: schedule.email,
        registrationId: schedule.registrationId
      });

      try {
        const sendRes = await sendEmail({
          to: schedule.email,
          recipientName: schedule.name,
          subject: topic.subject,
          html: emailHtml,
          type: 'admin_custom_announcement',
          category: 'EVENTS',
          metadata: {
            contestEventId: CONTEST_CONFIG.eventId,
            topicId: topic.id
          }
        });

        if (sendRes.success) {
          schedule.sentTopicIds.push(topicId);
          schedule.lastSentAt = now.toISOString();

          // Set next randomized interval: 24 to 72 hours
          const nextIntervalHours = getRandomIntervalHours(24, 72);
          const nextMs = nowMs + nextIntervalHours * 3600 * 1000;
          schedule.nextEligibleAt = new Date(nextMs).toISOString();

          if (nextMs > endMs) {
            schedule.status = 'COMPLETED';
          }

          schedule.logs.push({
            topicId,
            sentAt: now.toISOString(),
            status: 'SUCCESS'
          });
          summary.sentCount++;
        } else {
          summary.failedCount++;
          summary.errors.push(`Engagement send error for ${schedule.email}: ${sendRes.error}`);
        }
      } catch (err: any) {
        summary.failedCount++;
        summary.errors.push(`Engagement send exception for ${schedule.email}: ${err.message}`);
      }
    }

    saveAllEngagementSchedules(schedules);
    summary.message = `Processed ${summary.processedCount} participants: ${summary.sentCount} sent, ${summary.skippedCount} skipped, ${summary.failedCount} failed.`;
    return summary;

  } finally {
    isSchedulerRunning = false;
  }
}
