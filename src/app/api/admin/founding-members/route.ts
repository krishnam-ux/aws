import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FoundingMember } from '@/types/foundingMember';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === SECURE_TOKEN) {
    return true;
  }
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader.includes(`admin_token=${SECURE_TOKEN}`)) {
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

    const members = await db.foundingMembers.getAll();
    return NextResponse.json({ members }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error fetching founding members:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch founding members.' },
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
    const { action, member, memberId } = body;

    // 1. Create a new Founding Member record
    if (action === 'create') {
      if (!member?.email || !member?.fullName) {
        return NextResponse.json(
          { error: 'Full Name and Email are required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const existing = await db.foundingMembers.getByEmail(member.email);
      if (existing) {
        return NextResponse.json(
          { error: `Founding member with email ${member.email} already exists.` },
          { status: 409, headers: noStoreHeaders }
        );
      }

      const tokenBytes = crypto.randomBytes(16).toString('hex');
      const uniqueToken = `fm_tok_${tokenBytes}`;
      const now = new Date().toISOString();

      const newMember: FoundingMember = {
        id: `fm-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        fullName: member.fullName.trim(),
        name: member.fullName.trim(),
        email: member.email.trim().toLowerCase(),
        phone: member.phone?.trim() || '',
        university: member.university?.trim() || 'Chandigarh University',
        courseBranch: member.courseBranch?.trim() || '',
        yearSemester: member.yearSemester?.trim() || '',
        studentId: member.studentId?.trim() || '',
        photoUrl: member.photoUrl?.trim() || '',
        linkedin: member.linkedin?.trim() || '',
        github: member.github?.trim() || '',
        portfolio: member.portfolio?.trim() || '',
        domain: member.domain?.trim() || 'Cloud & Infrastructure',
        role: member.role?.trim() || 'Founding Member',
        skills: member.skills?.trim() || '',
        experience: member.experience?.trim() || '',
        bio: member.bio?.trim() || '',
        formToken: uniqueToken,
        formSubmitted: false,
        status: member.status || 'Invited',
        notes: member.notes?.trim() || '',
        createdAt: now,
        updatedAt: now
      };

      await db.foundingMembers.insertOne(newMember);

      return NextResponse.json(
        {
          success: true,
          message: 'Founding Member record created successfully.',
          member: newMember
        },
        { headers: noStoreHeaders }
      );
    }

    // 2. Update an existing Founding Member record
    if (action === 'update') {
      const targetId = memberId || member?.id;
      if (!targetId) {
        return NextResponse.json(
          { error: 'Member ID is required for update.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const existing = await db.foundingMembers.getById(targetId);
      if (!existing) {
        return NextResponse.json(
          { error: 'Founding Member record not found.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      const updatePayload: Partial<FoundingMember> = {
        ...member,
        name: member.fullName || member.name || existing.name,
        fullName: member.fullName || member.name || existing.fullName,
        updatedAt: new Date().toISOString()
      };

      await db.foundingMembers.updateOne(targetId, updatePayload);

      return NextResponse.json(
        {
          success: true,
          message: 'Founding Member updated successfully.',
          member: { ...existing, ...updatePayload }
        },
        { headers: noStoreHeaders }
      );
    }

    // 3. Delete a Founding Member record
    if (action === 'delete') {
      const targetId = memberId || member?.id;
      if (!targetId) {
        return NextResponse.json(
          { error: 'Member ID is required for deletion.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      await db.foundingMembers.deleteById(targetId);

      return NextResponse.json(
        {
          success: true,
          message: 'Founding Member deleted successfully.'
        },
        { headers: noStoreHeaders }
      );
    }

    // 4. Generate / Refresh Form Link Token
    if (action === 'generate_token') {
      const targetId = memberId || member?.id;
      if (!targetId) {
        return NextResponse.json(
          { error: 'Member ID is required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const existing = await db.foundingMembers.getById(targetId);
      if (!existing) {
        return NextResponse.json(
          { error: 'Founding Member record not found.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      const tokenBytes = crypto.randomBytes(16).toString('hex');
      const newToken = `fm_tok_${tokenBytes}`;
      const now = new Date().toISOString();

      await db.foundingMembers.updateOne(targetId, {
        formToken: newToken,
        updatedAt: now
      });

      return NextResponse.json(
        {
          success: true,
          message: 'New form link generated.',
          token: newToken
        },
        { headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400, headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error managing founding members:', err);
    return NextResponse.json(
      { error: err.message || 'Server error occurred.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
