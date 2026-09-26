import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { DigitalBadge, DigitalBadgeStats, CreateBadgeInput } from '@/types/digitalBadge';
import {
  sanitizeBadgeInput,
  validateBadgeInput,
  getBadgeUrl,
  getBadgeVerificationUrl,
  parseSkillsInput,
  DEFAULT_ISSUER_NAME,
  DEFAULT_ISSUER_LOGO
} from '@/lib/digitalBadgeUtils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === SECURE_TOKEN) {
    return true;
  }
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader.includes(`admin_token=${SECURE_TOKEN}`) || cookieHeader.includes(`adminToken=${SECURE_TOKEN}`)) {
    return true;
  }
  return false;
}

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get('credentialId');

    if (credentialId) {
      const cleanId = String(credentialId).trim().toUpperCase();
      const item = (await db.digitalBadges.getByCredentialId(cleanId)) || (await db.digitalBadges.getById(cleanId));
      if (!item) {
        return NextResponse.json({ error: 'Digital badge not found.' }, { status: 404, headers: noStoreHeaders });
      }

      const events = await db.digitalBadges.getEvents(item.credentialId, 50);
      const allEmailLogs = await db.emailLogs.getAll();
      const emailLogs = allEmailLogs.filter(
        (l: any) =>
          l.metadata?.credentialId?.toUpperCase() === item.credentialId.toUpperCase() ||
          (item.recipientEmail &&
            l.recipient?.toLowerCase() === item.recipientEmail.toLowerCase() &&
            l.type === 'digital_badge_delivery')
      );

      return NextResponse.json({ item, events, emailLogs }, { headers: noStoreHeaders });
    }

    const list = await db.digitalBadges.getAll();

    const stats: DigitalBadgeStats = {
      total: list.length,
      active: list.filter((b) => b.status === 'ACTIVE').length,
      revoked: list.filter((b) => b.status === 'REVOKED').length,
      recentlyIssued: list.slice(0, 5)
    };

    return NextResponse.json({ items: list, stats }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error in GET /api/admin/digital-badges:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch digital badges.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const action = body.action || (body.recipientName ? 'create' : 'unknown');

    // 1. CREATE DIGITAL BADGE
    if (action === 'create') {
      const payload: CreateBadgeInput = body.data || body;
      const sanitized = sanitizeBadgeInput(payload);
      const validation = validateBadgeInput(sanitized);

      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || 'Invalid badge input data.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      // Generate atomic monotonic credential ID
      const credentialId = await db.digitalBadges.getNextCredentialId();
      const uuid = crypto.randomUUID ? crypto.randomUUID() : `badge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date().toISOString();

      const newBadge: DigitalBadge = {
        id: uuid,
        credentialId,
        recipientName: sanitized.recipientName!,
        recipientEmail: sanitized.recipientEmail!,
        badgeTitle: sanitized.badgeTitle!,
        badgeDescription: sanitized.badgeDescription!,
        badgeImage: sanitized.badgeImage || '',
        issueDate: sanitized.issueDate || now.split('T')[0],
        issuerName: sanitized.issuerName || DEFAULT_ISSUER_NAME,
        issuerLogo: sanitized.issuerLogo || DEFAULT_ISSUER_LOGO,
        skills: parseSkillsInput(sanitized.skills),
        earningCriteria: sanitized.earningCriteria!,
        additionalInformation: sanitized.additionalInformation || undefined,
        credentialUrl: getBadgeUrl(credentialId),
        verificationUrl: getBadgeVerificationUrl(credentialId),
        status: 'ACTIVE',
        issuedAt: now,
        createdAt: now,
        updatedAt: now
      };

      const inserted = await db.digitalBadges.insertOne(newBadge);

      return NextResponse.json(
        {
          success: true,
          message: `Digital Badge ${credentialId} issued successfully for ${inserted.recipientName}.`,
          badge: inserted,
          credentialId: inserted.credentialId
        },
        { status: 201, headers: noStoreHeaders }
      );
    }

    // 2. UPDATE DIGITAL BADGE
    if (action === 'update') {
      const { id, credentialId, ...updateData } = body;
      const targetId = String(id || credentialId || '').trim();

      if (!targetId) {
        return NextResponse.json({ error: 'Credential ID or ID is required for update.' }, { status: 400, headers: noStoreHeaders });
      }

      const existing = (await db.digitalBadges.getById(targetId)) || (await db.digitalBadges.getByCredentialId(targetId));
      if (!existing) {
        return NextResponse.json({ error: 'Digital badge not found.' }, { status: 404, headers: noStoreHeaders });
      }

      if (existing.status === 'REVOKED') {
        return NextResponse.json(
          { error: 'Cannot modify a REVOKED badge. Revoked credentials are permanently locked.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const sanitizedUpdates = sanitizeBadgeInput(updateData);
      const updated = await db.digitalBadges.updateOne(existing.id, {
        ...sanitizedUpdates,
        skills: sanitizedUpdates.skills !== undefined ? parseSkillsInput(sanitizedUpdates.skills) : existing.skills,
        updatedAt: new Date().toISOString()
      });

      return NextResponse.json({ success: true, badge: updated }, { headers: noStoreHeaders });
    }

    // 3. REVOKE DIGITAL BADGE
    if (action === 'revoke') {
      const targetId = String(body.id || body.credentialId || '').trim();
      const reason = String(body.reason || body.revokedReason || 'Revoked by administrator').trim();

      if (!targetId) {
        return NextResponse.json({ error: 'Credential ID or ID is required for revocation.' }, { status: 400, headers: noStoreHeaders });
      }

      const existing = (await db.digitalBadges.getById(targetId)) || (await db.digitalBadges.getByCredentialId(targetId));
      if (!existing) {
        return NextResponse.json({ error: 'Digital badge not found.' }, { status: 404, headers: noStoreHeaders });
      }

      if (existing.status === 'REVOKED') {
        return NextResponse.json(
          { error: `Badge ${existing.credentialId} is already REVOKED.` },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const revoked = await db.digitalBadges.revoke(existing.id, {
        revokedReason: reason,
        revokedBy: 'Administrator',
        adminId: 'admin'
      });

      return NextResponse.json(
        {
          success: true,
          message: `Badge ${existing.credentialId} has been REVOKED and permanently retired.`,
          badge: revoked
        },
        { headers: noStoreHeaders }
      );
    }

    // 4. DELETE DIGITAL BADGE (Admin Maintenance)
    if (action === 'delete') {
      const targetId = String(body.id || body.credentialId || '').trim();
      if (!targetId) {
        return NextResponse.json({ error: 'Credential ID or ID is required for deletion.' }, { status: 400, headers: noStoreHeaders });
      }

      const deleted = await db.digitalBadges.deleteById(targetId);
      if (!deleted) {
        return NextResponse.json({ error: 'Digital badge not found or already deleted.' }, { status: 404, headers: noStoreHeaders });
      }

      return NextResponse.json({ success: true, message: 'Digital badge deleted successfully.' }, { headers: noStoreHeaders });
    }

    return NextResponse.json({ error: `Unknown action: "${action}"` }, { status: 400, headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error in POST /api/admin/digital-badges:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error in digital badges admin handler.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
