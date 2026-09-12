import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FoundingMember, FoundingMemberFormConfig } from '@/types/foundingMember';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');

    const formConfig: FoundingMemberFormConfig = await db.foundingMemberFormConfig.getConfig();

    let existingMember: FoundingMember | null = null;
    if (emailParam) {
      existingMember = await db.foundingMembers.getByEmail(emailParam);
    }

    return NextResponse.json(
      {
        published: formConfig.status === 'Published',
        config: formConfig,
        questions: (formConfig.questions || []).filter((q) => q.enabled),
        existingMember: existingMember
          ? {
              id: existingMember.id,
              memberId: existingMember.memberId,
              fullName: existingMember.fullName || existingMember.name,
              email: existingMember.email,
              phone: existingMember.phone || '',
              university: existingMember.university || '',
              courseBranch: existingMember.courseBranch || '',
              yearSemester: existingMember.yearSemester || '',
              studentId: existingMember.studentId || '',
              photoUrl: existingMember.photoUrl || '',
              linkedin: existingMember.linkedin || '',
              github: existingMember.github || '',
              portfolio: existingMember.portfolio || '',
              domain: existingMember.domain || '',
              role: existingMember.role || '',
              skills: existingMember.skills || '',
              experience: existingMember.experience || '',
              bio: existingMember.bio || '',
              customAnswers: existingMember.customAnswers || {},
              formSubmitted: Boolean(existingMember.formSubmitted),
              formSubmittedAt: existingMember.formSubmittedAt || null
            }
          : null
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in public founding members form GET:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve form information.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
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
      bio,
      customAnswers
    } = body;

    // 1. Basic validation
    if (!fullName || !String(fullName).trim()) {
      return NextResponse.json(
        { error: 'Full Name is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!email || !String(email).trim() || !String(email).includes('@')) {
      return NextResponse.json(
        { error: 'A valid Email Address is required to identify your profile.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!phone || !String(phone).trim()) {
      return NextResponse.json(
        { error: 'WhatsApp / Contact Phone Number is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!university || !String(university).trim()) {
      return NextResponse.json(
        { error: 'University / Institute Name is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!courseBranch || !String(courseBranch).trim()) {
      return NextResponse.json(
        { error: 'Course / Branch is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!yearSemester || !String(yearSemester).trim()) {
      return NextResponse.json(
        { error: 'Year / Semester is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!studentId || !String(studentId).trim()) {
      return NextResponse.json(
        { error: 'Student ID / Roll Number is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!domain || !String(domain).trim()) {
      return NextResponse.json(
        { error: 'Primary Domain / Area of Focus is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!skills || !String(skills).trim()) {
      return NextResponse.json(
        { error: 'Technical Skills summary is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!experience || !String(experience).trim()) {
      return NextResponse.json(
        { error: 'Experience & Contributions details are required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(fullName).trim();
    const now = new Date().toISOString();

    // 2. Check if member already exists in Founding Members data store by email
    const existingMember = await db.foundingMembers.getByEmail(cleanEmail);

    let savedMemberId: string;
    let savedDbId: string;
    let isUpdate = false;

    if (existingMember) {
      // Update existing record
      isUpdate = true;
      savedDbId = existingMember.id;
      savedMemberId = existingMember.memberId || (await db.foundingMembers.getNextMemberId());

      const mergedCustomAnswers = {
        ...(existingMember.customAnswers || {}),
        ...(customAnswers || {})
      };

      const updatePayload: Partial<FoundingMember> = {
        memberId: savedMemberId,
        fullName: cleanName,
        name: cleanName,
        email: cleanEmail,
        phone: String(phone).trim(),
        university: String(university).trim(),
        courseBranch: String(courseBranch).trim(),
        yearSemester: String(yearSemester).trim(),
        studentId: String(studentId).trim(),
        photoUrl: photoUrl ? String(photoUrl).trim() : existingMember.photoUrl || '',
        linkedin: linkedin ? String(linkedin).trim() : existingMember.linkedin || '',
        github: github ? String(github).trim() : existingMember.github || '',
        portfolio: portfolio ? String(portfolio).trim() : existingMember.portfolio || '',
        domain: String(domain).trim(),
        skills: String(skills).trim(),
        experience: String(experience).trim(),
        bio: bio ? String(bio).trim() : existingMember.bio || '',
        customAnswers: mergedCustomAnswers,
        formSubmitted: true,
        formSubmittedAt: now,
        status: 'Active',
        updatedAt: now
      };

      await db.foundingMembers.updateOne(existingMember.id, updatePayload);
    } else {
      // Create new Founding Member record with permanent memberId
      savedMemberId = await db.foundingMembers.getNextMemberId();
      savedDbId = `fm-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      const newMember: FoundingMember = {
        id: savedDbId,
        memberId: savedMemberId,
        fullName: cleanName,
        name: cleanName,
        email: cleanEmail,
        phone: String(phone).trim(),
        university: String(university).trim(),
        courseBranch: String(courseBranch).trim(),
        yearSemester: String(yearSemester).trim(),
        studentId: String(studentId).trim(),
        photoUrl: photoUrl ? String(photoUrl).trim() : '',
        linkedin: linkedin ? String(linkedin).trim() : '',
        github: github ? String(github).trim() : '',
        portfolio: portfolio ? String(portfolio).trim() : '',
        domain: String(domain).trim(),
        role: 'Founding Member',
        skills: String(skills).trim(),
        experience: String(experience).trim(),
        bio: bio ? String(bio).trim() : '',
        customAnswers: customAnswers || {},
        formSubmitted: true,
        formSubmittedAt: now,
        status: 'Active',
        notes: 'Submitted via Shared Public Founding Member Form',
        createdAt: now,
        updatedAt: now
      };

      await db.foundingMembers.insertOne(newMember);
    }

    return NextResponse.json(
      {
        success: true,
        message: isUpdate
          ? `Founding Member details for ${cleanName} updated successfully!`
          : `Welcome! Founding Member registration for ${cleanName} recorded successfully.`,
        memberId: savedMemberId,
        member: {
          id: savedDbId,
          memberId: savedMemberId,
          fullName: cleanName,
          email: cleanEmail,
          domain: String(domain).trim(),
          formSubmittedAt: now
        }
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error processing founding member form submission:', err);
    return NextResponse.json(
      { error: err.message || 'Server error occurred while submitting form.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
