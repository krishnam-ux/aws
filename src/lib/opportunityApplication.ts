export function normalizeEmail(value?: string | null): string {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeOrigin(value?: string | null): string | null {
  if (!value) return null;
  try {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = new URL(normalized.includes('://') ? normalized : `https://${normalized}`);
    return parsed.origin;
  } catch {
    return null;
  }
}

export function buildOpportunitySuccessUrl(
  requestUrl: string | URL,
  slug: string,
  requestHeaders?: Headers,
): string {
  const requestOrigin = (() => {
    try {
      const url = new URL(requestUrl.toString());
      if (url.origin && url.origin !== 'null') {
        return url.origin;
      }
    } catch {
      // ignored
    }
    return null;
  })();

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const productionOrigin = normalizeOrigin(productionUrl) || normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);

  const forwardedProto = requestHeaders?.get('x-forwarded-proto') || 'https';
  const forwardedHost = requestHeaders?.get('x-forwarded-host') || requestHeaders?.get('host');
  const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
  const requestHostOrigin = requestOrigin && !requestOrigin.includes('localhost') ? requestOrigin : null;
  const origin = forwardedOrigin || requestHostOrigin || productionOrigin || 'http://localhost:3000';

  return new URL(`/opportunities/${slug}?submitted=1`, origin).toString();
}

export function hasDuplicateOpportunityApplication(
  applications: Array<{ opportunityId?: string | null; email?: string | null }>,
  opportunityId: string,
  email: string,
): boolean {
  const normalizedEmail = normalizeEmail(email);
  if (!opportunityId || !normalizedEmail) {
    return false;
  }

  return applications.some((application) => {
    if (application.opportunityId !== opportunityId) {
      return false;
    }
    return normalizeEmail(application.email) === normalizedEmail;
  });
}

export function isValidGoogleDriveUrl(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const withProto = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProto);

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'drive.google.com' && host !== 'docs.google.com') {
      return false;
    }

    const path = parsed.pathname.trim();
    if ((path === '' || path === '/') && !parsed.search) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export type OpportunityFormType = 'founding-member' | 'core-team' | 'anchor-speaker';

export const OPPORTUNITY_DOMAINS = [
  'Tech & Technical',
  'Growth & Community',
  'Media & Creative'
] as const;

export type OpportunityDomain = typeof OPPORTUNITY_DOMAINS[number];

export const CORE_TEAM_ROLES_BY_DOMAIN: Record<OpportunityDomain, string[]> = {
  'Tech & Technical': [
    'Technical Content / Workshops',
    'Cloud / AWS',
    'Web / Software Development',
    'DevOps / Infrastructure',
    'Technical Operations',
    'Other Technical Responsibility'
  ],
  'Growth & Community': [
    'Community Management',
    'Outreach',
    'Partnerships / Networking',
    'Event Coordination',
    'Member Engagement',
    'Growth / Promotion',
    'Other Growth Responsibility'
  ],
  'Media & Creative': [
    'Social Media',
    'Graphic Design',
    'Video Editing',
    'Photography / Coverage',
    'Content Creation',
    'Branding / Creative',
    'Other Media Responsibility'
  ]
};

export function getOpportunityFormType(slug: string = '', title: string = ''): OpportunityFormType {
  const s = (slug || '').toLowerCase().trim();
  const t = (title || '').toLowerCase().trim();

  // If Anchor or Speaker is explicitly mentioned -> anchor-speaker
  if (s.includes('anchor') || s.includes('speaker') || t.includes('anchor') || t.includes('speaker')) {
    return 'anchor-speaker';
  }

  // If Core Team is specifically indicated
  if (
    s === 'core-team' ||
    s.startsWith('core-team-') ||
    s.includes('core-team') ||
    s.includes('core_team') ||
    (t.includes('core team') && !t.includes('founding')) ||
    s === 'core-members'
  ) {
    return 'core-team';
  }

  // If Founding Member is indicated
  if (
    s === 'founding-members' ||
    s === 'founding-member' ||
    s.includes('founding') ||
    t.includes('founding')
  ) {
    return 'founding-member';
  }

  // Default fallback form type is anchor-speaker
  return 'anchor-speaker';
}
