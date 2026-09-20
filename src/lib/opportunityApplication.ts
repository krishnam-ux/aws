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

export function isValidLinkedInUrl(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const withProto = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProto);

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) {
      return false;
    }

    const path = parsed.pathname.trim();
    if (path === '' || path === '/') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export type OpportunityFormType = 'founding-member' | 'core-team' | 'anchor-speaker';
export type CanonicalOpportunityType = 'FOUNDING_MEMBER' | 'CORE_TEAM' | 'ANCHOR_SPEAKER';

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

/**
 * Authoritative Canonical Opportunity Application Type Resolver.
 * Resolves an application to FOUNDING_MEMBER, CORE_TEAM, or ANCHOR_SPEAKER
 * using stable stored identifiers, opportunity context, and questions.
 */
export function resolveOpportunityApplicationType(
  application?: {
    formType?: string;
    opportunitySlug?: string;
    opportunityId?: string;
    opportunityTitle?: string;
    whyCoreTeam?: string;
    whyFoundingMember?: string;
    preferredRole?: string;
    primarySkillLevel?: string;
    exactResponsibility?: string;
    teamworkSituation?: string;
    scenarioUnavailableMembers?: string;
    personalContribution?: string;
    communityGrowthIdeas?: string;
    scenarioDropParticipation?: string;
    roleAndImpact?: string;
    academicBalance?: string;
    [key: string]: any;
  } | null,
  opportunityContext?: {
    slug?: string;
    title?: string;
    id?: string;
  } | string | null
): CanonicalOpportunityType {
  if (!application && !opportunityContext) {
    return 'ANCHOR_SPEAKER';
  }

  // 1. Explicit stored formType on the application record
  const rawFormType = String(application?.formType || '').toLowerCase().trim();
  if (rawFormType === 'founding-member' || rawFormType === 'founding_member' || rawFormType === 'founding') {
    return 'FOUNDING_MEMBER';
  }
  if (rawFormType === 'core-team' || rawFormType === 'core_team' || rawFormType === 'core') {
    return 'CORE_TEAM';
  }
  if (rawFormType === 'anchor-speaker' || rawFormType === 'anchor_speaker' || rawFormType === 'anchor' || rawFormType === 'speaker') {
    return 'ANCHOR_SPEAKER';
  }

  // 2. Canonical Opportunity Metadata (Title, Slug, ID)
  const ctxTitle = String(
    typeof opportunityContext === 'string'
      ? opportunityContext
      : opportunityContext?.title || application?.opportunityTitle || ''
  ).toLowerCase().trim();

  const ctxSlug = String(
    typeof opportunityContext === 'object' && opportunityContext !== null
      ? (opportunityContext.slug || application?.opportunitySlug || '')
      : (application?.opportunitySlug || '')
  ).toLowerCase().trim();

  const ctxId = String(
    typeof opportunityContext === 'object' && opportunityContext !== null
      ? (opportunityContext.id || application?.opportunityId || '')
      : (application?.opportunityId || '')
  ).toLowerCase().trim();

  const metaString = `${ctxTitle} ${ctxSlug} ${ctxId}`;

  // Anchor & Speaker
  if (metaString.includes('anchor') || metaString.includes('speaker')) {
    return 'ANCHOR_SPEAKER';
  }

  // Founding Member (Founding Member, founding-members, founding-core-members, etc.)
  if (metaString.includes('founding')) {
    return 'FOUNDING_MEMBER';
  }

  // Core Team (AWS SBG Core Team Member, core-team, core_team, core-members)
  if (
    metaString.includes('core team') ||
    metaString.includes('core-team') ||
    metaString.includes('core_team') ||
    metaString.includes('core-members') ||
    metaString.includes('core')
  ) {
    return 'CORE_TEAM';
  }

  // 3. Question-specific submitted answers on the application
  if (
    application?.whyCoreTeam ||
    application?.preferredRole ||
    application?.primarySkillLevel ||
    application?.exactResponsibility ||
    application?.teamworkSituation ||
    application?.scenarioUnavailableMembers ||
    (application?.availableDays && !application?.academicBalance)
  ) {
    return 'CORE_TEAM';
  }

  if (
    application?.whyFoundingMember ||
    application?.personalContribution ||
    application?.communityGrowthIdeas ||
    application?.scenarioDropParticipation ||
    application?.roleAndImpact ||
    application?.academicBalance
  ) {
    return 'FOUNDING_MEMBER';
  }

  // 4. Default fallback
  return 'ANCHOR_SPEAKER';
}

export function getOpportunityFormType(slug: string = '', title: string = ''): OpportunityFormType {
  const canonical = resolveOpportunityApplicationType(null, { slug, title });
  if (canonical === 'FOUNDING_MEMBER') return 'founding-member';
  if (canonical === 'CORE_TEAM') return 'core-team';
  return 'anchor-speaker';
}
