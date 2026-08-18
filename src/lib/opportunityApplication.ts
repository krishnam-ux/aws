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

  const forwardedProto = requestHeaders?.get('x-forwarded-proto');
  const forwardedHost = requestHeaders?.get('x-forwarded-host') || requestHeaders?.get('host');
  const forwardedOrigin = forwardedProto && forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
  const siteOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const origin = forwardedOrigin || requestOrigin || siteOrigin || 'http://localhost:3000';

  return new URL(`/careers/${slug}?submitted=1`, origin).toString();
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
