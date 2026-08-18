export function normalizeEmail(value?: string | null): string {
  return String(value ?? '').trim().toLowerCase();
}

export function buildOpportunitySuccessUrl(requestUrl: string | URL, slug: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(requestUrl.toString()).origin;
  return new URL(`/careers/${slug}?submitted=1`, siteUrl).toString();
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
