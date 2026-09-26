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
      return NextResponse.json(
        {
          valid: false,
          status: 'UNKNOWN',
          verified: false,
          message: 'Credential ID is required.'
        },
        { status: 400 }
      );
    }

    const cleanId = String(rawId).trim().toUpperCase();
    const badge = (await db.digitalBadges.getByCredentialId(cleanId)) || (await db.digitalBadges.getById(cleanId));

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    if (!badge) {
      return NextResponse.json(
        {
          valid: false,
          status: 'UNKNOWN',
          verified: false,
          credentialId: cleanId,
          message: 'Credential not found or invalid credential ID.'
        },
        { status: 404 }
      );
    }

    // Log verification event
    db.digitalBadges.logEvent({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      credentialId: badge.credentialId,
      eventType: 'BADGE_VERIFIED',
      timestamp: new Date().toISOString(),
      ipAddress: ip,
      userAgent: userAgent,
      details: {
        status: badge.status
      }
    }).catch(() => {});

    if (badge.status === 'REVOKED') {
      return NextResponse.json({
        valid: false,
        status: 'REVOKED',
        verified: false,
        credentialId: badge.credentialId,
        message: `This credential was revoked by the issuer${badge.revokedReason ? `: ${badge.revokedReason}` : '.'}`,
        badge: getPublicBadgeData(badge)
      });
    }

    return NextResponse.json({
      valid: true,
      status: 'ACTIVE',
      verified: true,
      credentialId: badge.credentialId,
      message: 'This credential is valid and was issued by AWS Student Builder Group – Chandigarh University Uttar Pradesh.',
      badge: getPublicBadgeData(badge)
    });
  } catch (err: any) {
    console.error('Error during live badge verification:', err);
    return NextResponse.json(
      {
        valid: false,
        status: 'UNKNOWN',
        verified: false,
        message: 'Verification engine encountered a server error.'
      },
      { status: 500 }
    );
  }
}
