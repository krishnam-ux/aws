import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { DigitalIdentity, DigitalIdStats } from '@/types/digitalIdentity';
import { validateDigitalIdPayload } from '@/lib/digitalIdUtils';

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
    const publicId = searchParams.get('publicId');

    if (publicId) {
      const item = await db.digitalIdentities.getByPublicId(publicId);
      if (!item) {
        return NextResponse.json({ error: 'Digital ID not found.' }, { status: 404, headers: noStoreHeaders });
      }
      const logs = await db.digitalIdVerifications.getByDigitalId(publicId, 20);
      return NextResponse.json({ item, logs }, { headers: noStoreHeaders });
    }

    const list = await db.digitalIdentities.getAll();

    const stats: DigitalIdStats = {
      total: list.length,
      active: list.filter(m => m.status === 'ACTIVE').length,
      suspended: list.filter(m => m.status === 'SUSPENDED').length,
      revoked: list.filter(m => m.status === 'REVOKED').length,
      recentlyIssued: list.slice(0, 5)
    };

    return NextResponse.json({ items: list, stats }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error in GET /api/admin/digital-ids:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch digital IDs.' },
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
    const { action } = body;

    // 1. CREATE DIGITAL ID
    if (action === 'create' || (!action && (body.fullName || body.data?.fullName))) {
      const validation = validateDigitalIdPayload(body.data || body);
      if (!validation.valid || !validation.sanitized) {
        return NextResponse.json(
          { error: validation.error || 'Validation failed.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const clean = validation.sanitized;
      const publicId = await db.digitalIdentities.getNextPublicId(clean.memberType);
      const verificationToken = `did_tok_${crypto.randomBytes(16).toString('hex')}`;
      const now = new Date().toISOString();

      const newRecord: DigitalIdentity = {
        id: `did-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        publicId,
        memberType: clean.memberType,
        fullName: clean.fullName,
        photoUrl: clean.photoUrl || '',
        role: clean.role,
        domain: clean.domain || 'Cloud & Infrastructure',
        university: clean.university || 'Chandigarh University – Uttar Pradesh',
        course: clean.course || '',
        branch: clean.branch || '',
        currentYear: clean.currentYear || '',
        email: clean.email || '',
        linkedin: clean.linkedin || '',
        joiningDate: clean.joiningDate || '',
        additionalInformation: clean.additionalInformation || '',
        status: 'ACTIVE',
        verificationToken,
        issuedAt: now,
        updatedAt: now,
        createdAt: now
      };

      await db.digitalIdentities.insertOne(newRecord);

      return NextResponse.json(
        { success: true, item: newRecord, message: `Digital ID ${publicId} issued successfully.` },
        { headers: noStoreHeaders }
      );
    }

    // 2. UPDATE DIGITAL ID
    if (action === 'update') {
      const { id, publicId, data } = body;
      const targetId = id || publicId;
      if (!targetId) {
        return NextResponse.json(
          { error: 'ID or Public ID is required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const existing = await db.digitalIdentities.getById(targetId) || await db.digitalIdentities.getByPublicId(targetId);
      if (!existing) {
        return NextResponse.json(
          { error: 'Digital ID record not found.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      const validation = validateDigitalIdPayload({
        fullName: existing.fullName,
        memberType: existing.memberType,
        role: existing.role,
        photoUrl: existing.photoUrl,
        domain: existing.domain,
        university: existing.university,
        course: existing.course,
        branch: existing.branch,
        currentYear: existing.currentYear,
        email: existing.email,
        linkedin: existing.linkedin,
        joiningDate: existing.joiningDate,
        additionalInformation: existing.additionalInformation,
        ...(body.data || body)
      });
      if (!validation.valid || !validation.sanitized) {
        return NextResponse.json(
          { error: validation.error || 'Validation failed.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const clean = validation.sanitized;
      // Note: Preserve existing publicId and ID
      const updated = await db.digitalIdentities.updateOne(existing.id, {
        fullName: clean.fullName,
        photoUrl: clean.photoUrl,
        memberType: clean.memberType,
        role: clean.role,
        domain: clean.domain,
        university: clean.university,
        course: clean.course,
        branch: clean.branch,
        currentYear: clean.currentYear,
        email: clean.email,
        linkedin: clean.linkedin,
        joiningDate: clean.joiningDate,
        additionalInformation: clean.additionalInformation
      });

      return NextResponse.json(
        { success: true, item: updated, message: 'Digital ID profile updated successfully.' },
        { headers: noStoreHeaders }
      );
    }

    // 3. CHANGE STATUS (ACTIVE / SUSPENDED / REVOKED)
    if (action === 'change-status') {
      const { publicId, id, status, reason, actor } = body;
      const targetId = publicId || id;
      if (!targetId || !status) {
        return NextResponse.json(
          { error: 'Digital ID and status are required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be ACTIVE, SUSPENDED, or REVOKED.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const existing = await db.digitalIdentities.getByPublicId(targetId) || await db.digitalIdentities.getById(targetId);
      if (!existing) {
        return NextResponse.json(
          { error: 'Digital ID record not found.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      const updated = await db.digitalIdentities.updateStatus(
        existing.publicId,
        status,
        reason,
        actor || 'Administrator'
      );

      return NextResponse.json(
        {
          success: true,
          item: updated,
          message: `Digital ID ${existing.publicId} status changed to ${status}.`
        },
        { headers: noStoreHeaders }
      );
    }

    // 4. GET AUDIT LOGS
    if (action === 'get-logs') {
      const { publicId, limit } = body;
      if (publicId) {
        const logs = await db.digitalIdVerifications.getByDigitalId(publicId, limit || 50);
        return NextResponse.json({ logs }, { headers: noStoreHeaders });
      }
      const logs = await db.digitalIdVerifications.getAll(limit || 100);
      return NextResponse.json({ logs }, { headers: noStoreHeaders });
    }

    // 5. DELETE RECORD (Admin action)
    if (action === 'delete') {
      const { id, publicId } = body;
      const targetId = id || publicId;
      if (!targetId) {
        return NextResponse.json(
          { error: 'Target ID is required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }
      const existing = await db.digitalIdentities.getByPublicId(targetId) || await db.digitalIdentities.getById(targetId);
      if (!existing) {
        return NextResponse.json(
          { error: 'Digital ID record not found.' },
          { status: 404, headers: noStoreHeaders }
        );
      }
      await db.digitalIdentities.deleteById(existing.id);
      return NextResponse.json(
        { success: true, message: `Digital ID ${existing.publicId} (${existing.fullName}) permanently deleted.` },
        { headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      { error: 'Unknown action.' },
      { status: 400, headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in POST /api/admin/digital-ids:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process request.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const { id, publicId, status, reason, actor, action } = body;
    const targetId = id || publicId;

    if (!targetId) {
      return NextResponse.json(
        { error: 'ID or Public ID is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const existing = await db.digitalIdentities.getByPublicId(targetId) || await db.digitalIdentities.getById(targetId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Digital ID record not found.' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    // 1. If status change requested
    if (status || action === 'change-status') {
      const targetStatus = status || body.data?.status;
      if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(targetStatus)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be ACTIVE, SUSPENDED, or REVOKED.' },
          { status: 400, headers: noStoreHeaders }
        );
      }
      const updated = await db.digitalIdentities.updateStatus(
        existing.publicId,
        targetStatus,
        reason || body.data?.reason,
        actor || 'Administrator'
      );
      return NextResponse.json(
        {
          success: true,
          item: updated,
          message: `Digital ID ${existing.publicId} status changed to ${targetStatus}.`
        },
        { headers: noStoreHeaders }
      );
    }

    // 2. Profile updates
    const validation = validateDigitalIdPayload({
      fullName: existing.fullName,
      memberType: existing.memberType,
      role: existing.role,
      photoUrl: existing.photoUrl,
      domain: existing.domain,
      university: existing.university,
      course: existing.course,
      branch: existing.branch,
      currentYear: existing.currentYear,
      email: existing.email,
      linkedin: existing.linkedin,
      joiningDate: existing.joiningDate,
      additionalInformation: existing.additionalInformation,
      ...(body.data || body)
    });
    if (!validation.valid || !validation.sanitized) {
      return NextResponse.json(
        { error: validation.error || 'Validation failed.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const clean = validation.sanitized;
    const updated = await db.digitalIdentities.updateOne(existing.id, {
      fullName: clean.fullName,
      photoUrl: clean.photoUrl,
      memberType: clean.memberType,
      role: clean.role,
      domain: clean.domain,
      university: clean.university,
      course: clean.course,
      branch: clean.branch,
      currentYear: clean.currentYear,
      email: clean.email,
      linkedin: clean.linkedin,
      joiningDate: clean.joiningDate,
      additionalInformation: clean.additionalInformation
    });

    return NextResponse.json(
      { success: true, item: updated, message: 'Digital ID profile updated successfully.' },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in PATCH /api/admin/digital-ids:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update digital ID.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id') || searchParams.get('publicId');

    let targetId = queryId;
    if (!targetId) {
      try {
        const body = await request.json();
        targetId = body.id || body.publicId;
      } catch {
        // no body
      }
    }

    if (!targetId) {
      return NextResponse.json(
        { error: 'Target ID is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const existing = await db.digitalIdentities.getByPublicId(targetId) || await db.digitalIdentities.getById(targetId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Digital ID record not found.' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    await db.digitalIdentities.deleteById(existing.id);
    return NextResponse.json(
      { success: true, message: `Digital ID ${existing.publicId} (${existing.fullName}) permanently deleted.` },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in DELETE /api/admin/digital-ids:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete digital ID.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
