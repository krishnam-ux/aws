import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FoundingMember } from '@/types/foundingMember';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing form token.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const member: FoundingMember | null = await db.foundingMembers.getByToken(token);
    if (!member) {
      return NextResponse.json(
        { error: 'Form link is invalid or has expired. Please contact the administrator for an updated link.' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    // Return profile data for prefilling
    return NextResponse.json(
      {
        valid: true,
        member: {
          id: member.id,
          fullName: member.fullName || member.name || '',
          email: member.email || '',
          phone: member.phone || '',
          university: member.university || 'Chandigarh University',
          courseBranch: member.courseBranch || '',
          yearSemester: member.yearSemester || '',
          studentId: member.studentId || '',
          photoUrl: member.photoUrl || '',
          linkedin: member.linkedin || '',
          github: member.github || '',
          portfolio: member.portfolio || '',
          domain: member.domain || 'Cloud & Infrastructure',
          role: member.role || 'Founding Member',
          skills: member.skills || '',
          experience: member.experience || '',
          bio: member.bio || '',
          formSubmitted: Boolean(member.formSubmitted),
          formSubmittedAt: member.formSubmittedAt || null
        }
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error fetching form data by token:', err);
    return NextResponse.json(
      { error: err.message || 'Unable to retrieve form data.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing form token.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const existing: FoundingMember | null = await db.foundingMembers.getByToken(token);
    if (!existing) {
      return NextResponse.json(
        { error: 'Form link is invalid or has expired. Please contact the administrator.' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      university,
      courseBranch,
      yearSemester,
      studentId,
      photoUrl,
      linkedin,
      github,
      portfolio,
      domain,
      skills,
      experience,
      bio
    } = body;

    // Validation
    if (!fullName?.trim()) {
      return NextResponse.json({ error: 'Full Name is required.' }, { status: 400, headers: noStoreHeaders });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email Address is required.' }, { status: 400, headers: noStoreHeaders });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Contact Phone Number is required.' }, { status: 400, headers: noStoreHeaders });
    }
    if (!university?.trim()) {
      return NextResponse.json({ error: 'University / Institute Name is required.' }, { status: 400, headers: noStoreHeaders });
    }
    if (!courseBranch?.trim()) {
      return NextResponse.json({ error: 'Course / Branch is required.' }, { status: 400, headers: noStoreHeaders });
    }
    if (!yearSemester?.trim()) {
      return NextResponse.json({ error: 'Year / Semester is required.' }, { status: 400, headers: noStoreHeaders });
    }
    if (!studentId?.trim()) {
      return NextResponse.json({ error: 'Roll Number / Student ID is required.' }, { status: 400, headers: noStoreHeaders });
    }
    if (!domain?.trim()) {
      return NextResponse.json({ error: 'Domain / Area of Focus is required.' }, { status: 400, headers: noStoreHeaders });
    }
    if (!skills?.trim()) {
      return NextResponse.json({ error: 'Technical Skills summary is required.' }, { status: 400, headers: noStoreHeaders });
    }
    if (!experience?.trim()) {
      return NextResponse.json({ error: 'Experience & Contributions are required.' }, { status: 400, headers: noStoreHeaders });
    }

    const now = new Date().toISOString();

    // Update the corresponding existing Founding Member record strictly in db.foundingMembers
    const updatePayload: Partial<FoundingMember> = {
      fullName: fullName.trim(),
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      university: university.trim(),
      courseBranch: courseBranch.trim(),
      yearSemester: yearSemester.trim(),
      studentId: studentId.trim(),
      photoUrl: photoUrl?.trim() || existing.photoUrl || '',
      linkedin: linkedin?.trim() || '',
      github: github?.trim() || '',
      portfolio: portfolio?.trim() || '',
      domain: domain.trim(),
      skills: skills.trim(),
      experience: experience.trim(),
      bio: bio?.trim() || '',
      formSubmitted: true,
      formSubmittedAt: now,
      status: 'Active',
      updatedAt: now
    };

    await db.foundingMembers.updateOne(existing.id, updatePayload);

    return NextResponse.json(
      {
        success: true,
        message: 'Your Founding Member details have been submitted and recorded successfully!',
        member: {
          id: existing.id,
          fullName: updatePayload.fullName,
          email: updatePayload.email,
          domain: updatePayload.domain,
          formSubmittedAt: updatePayload.formSubmittedAt
        }
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error submitting founding member form:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred while saving your details.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
