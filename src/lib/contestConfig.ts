/**
 * AWS Card Clash Contest Configuration and Server-authoritative Schedule
 * Launch: 24 November 2026, 9:00 AM IST (Asia/Kolkata)
 * End: 4 December 2026, 11:59 PM IST (Asia/Kolkata)
 */

export const CONTEST_CONFIG = {
  eventId: 'event-aws-card-clash-contest',
  eventName: 'AWS Card Clash: Security Island Contest',
  
  // Exact Launch: 24 November 2026, 09:00 AM IST (UTC+05:30)
  // In UTC ISO: 2026-11-24T03:30:00.000Z
  launchDateIso: '2026-11-24T03:30:00.000Z',
  launchDateIstString: '24 November 2026, 9:00 AM IST',

  // Official Contest End: 4 December 2026, 11:59 PM IST (18:29:59 UTC)
  // Consistent end date: 4 December 2026
  endDateIso: '2026-12-04T18:29:59.000Z',
  endDateDisplayString: '4 December 2026',
  endDateIstString: '4 December 2026, 11:59 PM IST',
  contestDateRangeString: '24 November to 4 December 2026',

  // Verified Event Code and URLs
  eventCode: '515553',
  officialAppDownloadUrl: 'https://cardclash.skillbuilder.aws/get',
  webPlayUrl: 'https://cardclash.skillbuilder.aws',
  appStoreUrl: 'https://apps.apple.com/app/aws-card-clash/id6477810360',
  googlePlayUrl: 'https://play.google.com/store/apps/details?id=com.amazon.aws.cardclash',
  
  // QR Code Asset Path
  qrCodeAssetPath: '/contest/card-clash-qr-clean.png',
  
  // Timezone
  timezone: 'Asia/Kolkata',

  // Exact required registration success message
  successMessage: 'Your registration is successful! Your event code has been sent to your registered email address. Please check your inbox and spam folder.'
};

export type ContestStatus = 'LOCKED' | 'LIVE' | 'ENDED';

export interface ContestStateResponse {
  status: ContestStatus;
  isLocked: boolean;
  isLive: boolean;
  isEnded: boolean;
  currentTimeIso: string;
  launchDateIso: string;
  endDateIso: string;
  message: string;
  timeRemainingMs: number;
}

/**
 * Returns server-authoritative contest status.
 * Supports test clock override in development / test environments.
 */
export function getContestState(overrideDate?: Date | string | null): ContestStateResponse {
  const now = overrideDate ? new Date(overrideDate) : new Date();
  const launchTime = new Date(CONTEST_CONFIG.launchDateIso).getTime();
  const endTime = new Date(CONTEST_CONFIG.endDateIso).getTime();
  const nowTime = now.getTime();

  if (nowTime < launchTime) {
    return {
      status: 'LOCKED',
      isLocked: true,
      isLive: false,
      isEnded: false,
      currentTimeIso: now.toISOString(),
      launchDateIso: CONTEST_CONFIG.launchDateIso,
      endDateIso: CONTEST_CONFIG.endDateIso,
      message: `Contest unlocks on ${CONTEST_CONFIG.launchDateIstString}`,
      timeRemainingMs: launchTime - nowTime
    };
  }

  if (nowTime >= launchTime && nowTime <= endTime) {
    return {
      status: 'LIVE',
      isLocked: false,
      isLive: true,
      isEnded: false,
      currentTimeIso: now.toISOString(),
      launchDateIso: CONTEST_CONFIG.launchDateIso,
      endDateIso: CONTEST_CONFIG.endDateIso,
      message: 'Contest is LIVE NOW! Join with event code.',
      timeRemainingMs: endTime - nowTime
    };
  }

  return {
    status: 'ENDED',
    isLocked: true,
    isLive: false,
    isEnded: true,
    currentTimeIso: now.toISOString(),
    launchDateIso: CONTEST_CONFIG.launchDateIso,
    endDateIso: CONTEST_CONFIG.endDateIso,
    message: 'The Security Island contest has concluded.',
    timeRemainingMs: 0
  };
}

/**
 * Safely masks an email address for public or participant-facing confirmation.
 * e.g., 'krishnamurari@example.com' -> 'kr*********i@example.com'
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const parts = email.trim().split('@');
  const localPart = parts[0];
  const domainPart = parts.slice(1).join('@');

  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domainPart}`;
  }
  const firstChars = localPart.slice(0, 2);
  const lastChar = localPart.slice(-1);
  const maskedMiddle = '*'.repeat(Math.max(3, localPart.length - 3));
  return `${firstChars}${maskedMiddle}${lastChar}@${domainPart}`;
}
