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

/**
 * Normalizes all opportunity application fields and legacy/alternative key aliases
 * into a single unified, canonical structure.
 */
export function normalizeOpportunityApplication(app: any): any {
  if (!app || typeof app !== 'object') return app;

  const department = String(app.department || app.branch || app.departmentName || app.department_name || '').trim();
  const currentYear = String(app.currentYear || app.current_year || app.year || app.academicYear || app.academic_year || app.currentAcademicYear || app.current_academic_year || '').trim();
  const studentId = String(app.studentId || app.student_id || app.rollNumber || app.roll_number || app.uid || '').trim();
  const graduationYear = String(app.graduationYear || app.graduation_year || app.expectedGraduationYear || app.expected_graduation_year || '').trim();
  
  const preferredDomain = String(app.preferredDomain || app.preferred_domain || app.domain || app.selectedDomain || app.selected_domain || app.track || '').trim();
  const preferredRole = String(app.preferredRole || app.preferred_role || app.role || app.selectedRole || app.selected_role || '').trim();
  
  const skills = String(app.skills || app.areasOfExpertise || app.relevantSkills || app.relevant_skills || '').trim();
  const primarySkillLevel = String(app.primarySkillLevel || app.primary_skill_level || app.skillLevel || app.skill_level || app.proficiency || '').trim();
  
  const experience = String(app.experience || app.previousExperience || app.previous_experience || app.projects || '').trim();
  const roleAndImpact = String(
    app.roleAndImpact ||
    app.role_and_impact ||
    app.impact ||
    (app.previousExperienceRole && app.previousExperienceImpact
      ? `${app.previousExperienceRole} - ${app.previousExperienceImpact}`
      : app.previousExperienceRole || app.previousExperienceImpact || '')
  ).trim();
  const exactResponsibility = String(app.exactResponsibility || app.exact_responsibility || app.responsibility || roleAndImpact || '').trim();
  
  const teamworkSituation = String(app.teamworkSituation || app.teamwork_situation || app.teamwork || '').trim();
  const leadershipExperience = String(app.leadershipExperience || app.leadership_experience || app.hasLeadership || app.has_leadership || '').trim();
  const leadershipDetails = String(app.leadershipDetails || app.leadership_details || app.leadershipInfo || app.leadership_info || '').trim();
  
  const whyFoundingMember = String(app.whyFoundingMember || app.why_founding_member || (app.motivation && !app.whyCoreTeam ? app.motivation : '')).trim();
  const whyCoreTeam = String(app.whyCoreTeam || app.why_core_team || (app.motivation && !app.whyFoundingMember ? app.motivation : '')).trim();
  const motivation = String(app.motivation || whyFoundingMember || whyCoreTeam || '').trim();
  
  const personalContribution = String(app.personalContribution || app.personal_contribution || app.contribution || app.contributions || '').trim();
  const domainContribution = String(app.domainContribution || app.domain_contribution || personalContribution || '').trim();
  const communityGrowthIdeas = String(app.communityGrowthIdeas || app.community_growth_ideas || app.growthIdeas || app.growth_ideas || app.ideas || '').trim();
  
  const scenarioDropParticipation = String(
    app.scenarioDropParticipation ||
    app.scenario_drop_participation ||
    app.ownershipScenario ||
    app.ownership_scenario ||
    app.scenarioAnswer ||
    app.scenario_answer ||
    app.scenario ||
    ''
  ).trim();
  
  const scenarioUnavailableMembers = String(
    app.scenarioUnavailableMembers ||
    app.scenario_unavailable_members ||
    app.crisisScenario ||
    app.crisis_scenario ||
    app.scenarioAnswer ||
    app.scenario_answer ||
    app.scenario ||
    ''
  ).trim();
  
  const scenarioAnswer = String(
    app.scenarioAnswer ||
    app.scenario_answer ||
    scenarioDropParticipation ||
    scenarioUnavailableMembers ||
    app.scenario ||
    ''
  ).trim();

  const availabilityHours = String(app.availabilityHours || app.availability_hours || app.weeklyAvailability || app.weekly_availability || app.weeklyHours || app.weekly_hours || '').trim();
  const consistentContribution = String(app.consistentContribution || app.consistent_contribution || app.consistentCommitment || app.consistent_commitment || app.commitment || '').trim();
  const contributionDuration = String(app.contributionDuration || app.contribution_duration || app.involvementDuration || app.involvement_duration || app.duration || '').trim();
  const academicBalance = String(app.academicBalance || app.academic_balance || app.academicManagement || app.academic_management || '').trim();
  
  const availableDays = String(app.availableDays || app.available_days || app.daysAvailable || app.days_available || app.schedule || '').trim();
  const activeParticipation = String(app.activeParticipation || app.active_participation || app.participationCommitment || app.participation_commitment || '').trim();
  const involvementDuration = String(app.involvementDuration || app.involvement_duration || contributionDuration || '').trim();
  
  const introductionVideoUrl = String(app.introductionVideoUrl || app.introduction_video_url || app.videoUrl || app.video_url || '').trim();
  const videoUrl = introductionVideoUrl;
  
  const linkedin = String(app.linkedin || '').trim();
  const github = String(app.github || '').trim();
  const portfolio = String(app.portfolio || '').trim();
  const resumeUrl = String(app.resumeUrl || app.resume_url || app.resume || '').trim();

  return {
    ...app,
    department,
    branch: department,
    currentYear,
    year: currentYear,
    studentId,
    rollNumber: studentId,
    graduationYear,
    preferredDomain,
    domain: preferredDomain,
    preferredRole,
    role: preferredRole,
    skills,
    primarySkillLevel,
    experience,
    previousExperience: experience,
    roleAndImpact: roleAndImpact || exactResponsibility,
    exactResponsibility: exactResponsibility || roleAndImpact,
    teamworkSituation,
    leadershipExperience,
    leadershipDetails,
    whyFoundingMember,
    whyCoreTeam,
    motivation,
    personalContribution,
    domainContribution,
    communityGrowthIdeas,
    scenarioDropParticipation,
    scenarioUnavailableMembers,
    scenarioAnswer,
    availabilityHours,
    weeklyAvailability: availabilityHours,
    consistentContribution,
    consistentCommitment: consistentContribution,
    contributionDuration,
    academicBalance,
    availableDays,
    activeParticipation,
    involvementDuration,
    introductionVideoUrl,
    videoUrl,
    linkedin,
    github,
    portfolio,
    resumeUrl,
    resume_url: resumeUrl,
  };
}


