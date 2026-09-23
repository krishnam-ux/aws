import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store'
};

export async function GET(
  request: Request,
  context: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await context.params;
    if (!publicId) {
      return NextResponse.json(
        { verified: false, status: 'NOT_FOUND', error: 'Missing Digital ID parameter.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const cleanId = String(publicId).trim().toUpperCase();
    const identity = await db.digitalIdentities.getByPublicId(cleanId);

    // Extract minimal device info for audit logging
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /mobile|iphone|android|ipad/i.test(userAgent);
    const deviceType = isMobile ? 'Mobile' : 'Desktop';
    let browser = 'Other';
    if (/chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/safari/i.test(userAgent)) browser = 'Safari';
    else if (/firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/edge/i.test(userAgent)) browser = 'Edge';

    if (!identity) {
      // Asynchronously log NOT_FOUND
      db.digitalIdVerifications.logVerification({
        digitalId: cleanId,
        timestamp: new Date().toISOString(),
        result: 'NOT_FOUND',
        deviceType,
        browser
      }).catch(err => console.error('Error logging verification:', err));

      return NextResponse.json(
        {
          verified: false,
          status: 'NOT_FOUND',
          digitalId: cleanId,
          message: 'This Digital ID could not be verified against the official registry.'
        },
        { status: 404, headers: noStoreHeaders }
      );
    }

    // Log verification event with actual result
    db.digitalIdVerifications.logVerification({
      digitalId: identity.publicId,
      timestamp: new Date().toISOString(),
      result: identity.status === 'ACTIVE' ? 'VERIFIED' : identity.status,
      deviceType,
      browser
    }).catch(err => console.error('Error logging verification:', err));

    // Handle SUSPENDED
    if (identity.status === 'SUSPENDED') {
      return NextResponse.json(
        {
          verified: false,
          status: 'SUSPENDED',
          digitalId: identity.publicId,
          fullName: identity.fullName,
          memberType: identity.memberType,
          role: identity.role,
          domain: identity.domain,
          suspendedAt: identity.suspendedAt,
          message: 'This Digital ID is temporarily inactive and cannot be verified as active.'
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // Handle REVOKED
    if (identity.status === 'REVOKED') {
      return NextResponse.json(
        {
          verified: false,
          status: 'REVOKED',
          digitalId: identity.publicId,
          fullName: identity.fullName,
          memberType: identity.memberType,
          role: identity.role,
          domain: identity.domain,
          revokedAt: identity.revokedAt,
          revokedReason: identity.revokedReason || 'Revoked by official community registry',
          message: 'This Digital ID is no longer active and has been revoked from the official registry.'
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    // Handle ACTIVE
    return NextResponse.json(
      {
        verified: true,
        status: 'ACTIVE',
        digitalId: identity.publicId,
        fullName: identity.fullName,
        photoUrl: identity.photoUrl,
        memberType: identity.memberType,
        role: identity.role,
        domain: identity.domain || '',
        university: identity.university || 'Chandigarh University – Uttar Pradesh',
        course: identity.course || '',
        branch: identity.branch || '',
        currentYear: identity.currentYear || '',
        issuedAt: identity.issuedAt || identity.createdAt,
        verifiedAt: new Date().toISOString(),
        officialRegistry: 'AWS Student Builder Group at Chandigarh University – Uttar Pradesh',
        verificationStatement: 'This identity was verified against the official Digital ID registry of AWS Student Builder Group at Chandigarh University – Uttar Pradesh.'
      },
      { status: 200, headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in /api/digital-ids/verify/[publicId]:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during verification.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
