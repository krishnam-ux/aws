import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPublicBadgeData } from '@/lib/digitalBadgeUtils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  context: { params: Promise<{ credentialId: string }> | { credentialId: string } }
) {
  try {
    const resolvedParams = await context.params;
    const rawId = resolvedParams?.credentialId;
    if (!rawId) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    const cleanId = String(rawId).trim().toUpperCase();
    const badge = (await db.digitalBadges.getByCredentialId(cleanId)) || (await db.digitalBadges.getById(cleanId));

    if (!badge) {
      return NextResponse.json({ error: 'Digital badge not found', credentialId: cleanId }, { status: 404 });
    }

    // Log badge viewed in background without blocking
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    db.digitalBadges.logEvent({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      credentialId: badge.credentialId,
      eventType: 'BADGE_VIEWED',
      timestamp: new Date().toISOString(),
      ipAddress: ip,
      userAgent: userAgent
    }).catch(() => {});

    return NextResponse.json({
      badge: getPublicBadgeData(badge)
    });
  } catch (err: any) {
    console.error('Error fetching public digital badge:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
