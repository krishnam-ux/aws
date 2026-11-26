import fs from 'fs';
import path from 'path';
import { CONTEST_CONFIG, getContestState } from '@/lib/contestConfig';
import { db } from '@/lib/db';
import {
  getAllEngagementSchedules,
  saveAllEngagementSchedules,
  ParticipantEngagementSchedule
} from '@/lib/contestEngagementScheduler';

export interface VerifiedWinner {
  rank: number;
  name: string;
  department?: string;
  university?: string;
  studentIdMasked?: string;
  points?: number;
  prize: string;
  status: 'VERIFIED' | 'PENDING';
  notes?: string;
}

export interface ContestShutdownAuditLog {
  step: string;
  timestamp: string;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  details?: string;
}

export interface ContestShutdownState {
  hasShutdown: boolean;
  shutdownAt: string | null;
  closingTimeIso: string;
  closingTimeIst: string;
  timezone: string;
  status: 'LIVE' | 'ENDED';
  archivedRegistrationsCount: number;
  activeCampaignsTerminated: number;
  eventStatusUpdated: boolean;
  winnersVerificationStatus: 'PENDING_VERIFICATION' | 'OFFICIALLY_CONFIRMED';
  verifiedWinners: VerifiedWinner[];
  executionLogs: ContestShutdownAuditLog[];
}

const SHUTDOWN_STATE_FILE = path.join(
  process.cwd(),
  'src',
  'data',
  'db',
  'contest_shutdown_state.json'
);

function getDefaultShutdownState(): ContestShutdownState {
  return {
    hasShutdown: false,
    shutdownAt: null,
    closingTimeIso: CONTEST_CONFIG.endDateIso,
    closingTimeIst: CONTEST_CONFIG.endDateIstString,
    timezone: CONTEST_CONFIG.timezone,
    status: 'LIVE',
    archivedRegistrationsCount: 0,
    activeCampaignsTerminated: 0,
    eventStatusUpdated: false,
    winnersVerificationStatus: 'PENDING_VERIFICATION',
    verifiedWinners: [
      {
        rank: 1,
        name: 'To Be Announced',
        prize: 'AWS Certified AI Practitioner exam voucher',
        status: 'PENDING',
        notes: 'Leaderboard review & verification in progress'
      },
      {
        rank: 2,
        name: 'To Be Announced',
        prize: 'AWS Certified AI Practitioner exam voucher',
        status: 'PENDING',
        notes: 'Leaderboard review & verification in progress'
      },
      {
        rank: 3,
        name: 'To Be Announced',
        prize: 'AWS Certified AI Practitioner exam voucher',
        status: 'PENDING',
        notes: 'Leaderboard review & verification in progress'
      },
      {
        rank: 4,
        name: 'To Be Announced',
        prize: 'AWS Certified AI Practitioner exam voucher',
        status: 'PENDING',
        notes: 'Leaderboard review & verification in progress'
      },
      {
        rank: 5,
        name: 'To Be Announced',
        prize: 'AWS Certified AI Practitioner exam voucher',
        status: 'PENDING',
        notes: 'Leaderboard review & verification in progress'
      }
    ],
    executionLogs: []
  };
}

export function readShutdownState(): ContestShutdownState {
  try {
    const dir = path.dirname(SHUTDOWN_STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(SHUTDOWN_STATE_FILE)) {
      const defaultState = getDefaultShutdownState();
      fs.writeFileSync(SHUTDOWN_STATE_FILE, JSON.stringify(defaultState, null, 2), 'utf8');
      return defaultState;
    }
    const raw = fs.readFileSync(SHUTDOWN_STATE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading contest shutdown state:', err);
    return getDefaultShutdownState();
  }
}

export function saveShutdownState(state: ContestShutdownState): void {
  try {
    const dir = path.dirname(SHUTDOWN_STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SHUTDOWN_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving contest shutdown state:', err);
  }
}

export interface ShutdownExecutionResult {
  success: boolean;
  shouldShutdown: boolean;
  alreadyShutdown: boolean;
  shutdownState: ContestShutdownState;
  message: string;
}

let isShuttingDown = false;

/**
 * Idempotently executes contest shutdown at or after closing time (4 December 2026, 11:59:59 PM IST).
 * 
 * Guarantees:
 * 1. Safe to call multiple times - runs once and returns cached state on subsequent runs.
 * 2. Stops all active promotional email campaigns in contest_email_schedules.json.
 * 3. Updates events.json event status to 'Completed' and registrationStatus to 'Closed'.
 * 4. Preserves ALL registrations, attendance records and audit logs.
 * 5. Sets winners verification state to PENDING_VERIFICATION.
 */
export async function executeContestShutdown(options: {
  overrideTime?: Date | string | null;
  force?: boolean;
} = {}): Promise<ShutdownExecutionResult> {
  const now = options.overrideTime ? new Date(options.overrideTime) : new Date();
  const contestState = getContestState(now);
  const nowMs = now.getTime();
  const endMs = new Date(CONTEST_CONFIG.endDateIso).getTime();

  // 1. Time evaluation: only shutdown if closing time has elapsed (or force=true for tests)
  if (nowMs < endMs && !options.force) {
    const state = readShutdownState();
    return {
      success: true,
      shouldShutdown: false,
      alreadyShutdown: false,
      shutdownState: state,
      message: `Contest is currently ${contestState.status}. Closing scheduled for ${CONTEST_CONFIG.endDateIstString}.`
    };
  }

  // 2. Concurrency mutex
  if (isShuttingDown) {
    const state = readShutdownState();
    return {
      success: true,
      shouldShutdown: true,
      alreadyShutdown: false,
      shutdownState: state,
      message: 'Contest shutdown is currently in progress.'
    };
  }

  // 3. Idempotency Check: if already shutdown and not force-testing, return immediately
  const currentState = readShutdownState();
  if (currentState.hasShutdown && !options.force) {
    return {
      success: true,
      shouldShutdown: true,
      alreadyShutdown: true,
      shutdownState: currentState,
      message: `Contest was already shut down on ${currentState.shutdownAt}. Idempotent run skipped.`
    };
  }

  isShuttingDown = true;

  try {
    const logs: ContestShutdownAuditLog[] = [...currentState.executionLogs];
    const timestampIso = now.toISOString();

    logs.push({
      step: 'START_SHUTDOWN',
      timestamp: timestampIso,
      status: 'SUCCESS',
      details: `Shutdown triggered at ${timestampIso} (Configured closing: ${CONTEST_CONFIG.endDateIstString})`
    });

    // 4. Step A: Terminate active contest promotional email campaigns
    let terminatedCampaignsCount = 0;
    try {
      const schedules = getAllEngagementSchedules();
      let updatedSchedules = false;
      for (const sched of schedules) {
        if (sched.status === 'ACTIVE') {
          sched.status = 'COMPLETED';
          updatedSchedules = true;
          terminatedCampaignsCount++;
        }
      }
      if (updatedSchedules) {
        saveAllEngagementSchedules(schedules);
      }
      logs.push({
        step: 'TERMINATE_PROMOTIONAL_CAMPAIGNS',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        details: `Stopped ${terminatedCampaignsCount} active promotional email campaigns.`
      });
    } catch (schedErr: any) {
      logs.push({
        step: 'TERMINATE_PROMOTIONAL_CAMPAIGNS',
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        details: schedErr?.message || 'Failed to update email schedules'
      });
    }

    // 5. Step B: Update event status in database/events.json without deleting anything
    let eventUpdated = false;
    let archivedRegistrationsCount = 0;
    try {
      const allEvents = await db.events.getAll();
      const contestEvent = allEvents.find((e: any) => e.id === CONTEST_CONFIG.eventId);
      if (contestEvent) {
        contestEvent.status = 'Completed';
        contestEvent.isRegistrationOpen = false;
        contestEvent.registrationStatus = 'Closed';
        await db.events.saveAll(allEvents);
        eventUpdated = true;
      }

      // Count preserved registrations
      const allRegistrations = await db.eventRegistrations.getAll();
      const contestRegistrations = allRegistrations.filter(
        (r: any) => r.eventId === CONTEST_CONFIG.eventId
      );
      archivedRegistrationsCount = contestRegistrations.length;

      logs.push({
        step: 'UPDATE_EVENT_RECORD',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        details: `Event ${CONTEST_CONFIG.eventId} marked Completed. Preserved ${archivedRegistrationsCount} registrations in admin portal.`
      });
    } catch (eventErr: any) {
      logs.push({
        step: 'UPDATE_EVENT_RECORD',
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        details: eventErr?.message || 'Failed to update event status'
      });
    }

    // 6. Step C: Save final persistent shutdown state
    const finalState: ContestShutdownState = {
      ...currentState,
      hasShutdown: true,
      shutdownAt: timestampIso,
      status: 'ENDED',
      archivedRegistrationsCount,
      activeCampaignsTerminated: terminatedCampaignsCount,
      eventStatusUpdated: eventUpdated,
      winnersVerificationStatus: currentState.winnersVerificationStatus || 'PENDING_VERIFICATION',
      executionLogs: logs
    };

    saveShutdownState(finalState);

    logs.push({
      step: 'COMPLETE_SHUTDOWN',
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      details: 'Contest shutdown completed successfully and idempotently.'
    });

    finalState.executionLogs = logs;
    saveShutdownState(finalState);

    return {
      success: true,
      shouldShutdown: true,
      alreadyShutdown: false,
      shutdownState: finalState,
      message: 'AWS Card Clash contest shutdown executed successfully.'
    };
  } finally {
    isShuttingDown = false;
  }
}

/**
 * Updates verified winners when officially confirmed by admin.
 */
export function updateVerifiedWinners(
  winners: VerifiedWinner[],
  status: 'PENDING_VERIFICATION' | 'OFFICIALLY_CONFIRMED' = 'OFFICIALLY_CONFIRMED'
): ContestShutdownState {
  const state = readShutdownState();
  state.verifiedWinners = winners;
  state.winnersVerificationStatus = status;
  state.executionLogs.push({
    step: 'UPDATE_WINNERS',
    timestamp: new Date().toISOString(),
    status: 'SUCCESS',
    details: `Updated ${winners.length} winners. Verification status: ${status}`
  });
  saveShutdownState(state);
  return state;
}

// Global in-process auto shutdown timer
let autoShutdownTimer: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

/**
 * Initializes automatic in-process background timer to guarantee expiry execution
 * even if nobody visits the website on 4 December 2026.
 */
export function initContestShutdownTimer(): void {
  // Only initialize once per runtime
  if (autoShutdownTimer || heartbeatInterval) return;

  const checkAndRun = async () => {
    try {
      const now = new Date();
      const endMs = new Date(CONTEST_CONFIG.endDateIso).getTime();
      if (now.getTime() >= endMs) {
        const state = readShutdownState();
        if (!state.hasShutdown) {
          console.log('[ContestShutdown] Server timer triggered automatic contest shutdown.');
          await executeContestShutdown();
        }
      }
    } catch (err) {
      console.error('[ContestShutdown] Error in timer check:', err);
    }
  };

  const endMs = new Date(CONTEST_CONFIG.endDateIso).getTime();
  const delayMs = endMs - Date.now();

  // If closing is in the future and within max 32-bit integer timeout (~24.8 days)
  if (delayMs > 0 && delayMs < 2147483647) {
    autoShutdownTimer = setTimeout(checkAndRun, delayMs);
    if (typeof autoShutdownTimer.unref === 'function') {
      autoShutdownTimer.unref();
    }
  }

  // Heartbeat check every 1 hour (unref'd so it doesn't block process exit)
  heartbeatInterval = setInterval(checkAndRun, 60 * 60 * 1000);
  if (typeof heartbeatInterval.unref === 'function') {
    heartbeatInterval.unref();
  }
}

// Auto-register background timer on module import
if (typeof window === 'undefined') {
  initContestShutdownTimer();
}
