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
              fullName: existingMember.fullName || existingMember.name || '',
              email: existingMember.email || '',
              phone: existingMember.phone || '',
              photoUrl: existingMember.photoUrl || '',
              university: existingMember.university || '',
              courseBranch: existingMember.courseBranch || '',
              yearSemester: existingMember.yearSemester || '',
              studentId: existingMember.studentId || '',
              memberRole: existingMember.memberRole || existingMember.role || '',
              domain: existingMember.domain || '',
              designation: existingMember.designation || '',
              dateOfJoining: existingMember.dateOfJoining || '',
              membershipStatus: existingMember.membershipStatus || existingMember.status || 'Active',
              skills: existingMember.skills || '',
              interests: existingMember.interests || '',
              linkedin: existingMember.linkedin || '',
              github: existingMember.github || '',
              portfolio: existingMember.portfolio || '',
              speakerRoleType: existingMember.speakerRoleType || '',
              speakingExperience: existingMember.speakingExperience || '',
              demoVideoUrl: existingMember.demoVideoUrl || '',
              speakingTopics: existingMember.speakingTopics || '',
              languages: existingMember.languages || '',
              eventAvailability: existingMember.eventAvailability || '',
              previousExperience: existingMember.previousExperience || '',
              contributionAreas: existingMember.contributionAreas || '',
              assignedResponsibilities: existingMember.assignedResponsibilities || '',
              majorAchievements: existingMember.majorAchievements || '',
              experience: existingMember.experience || '',
              certifications: existingMember.certifications || '',
              digitalBadges: existingMember.digitalBadges || '',
              eventsParticipated: existingMember.eventsParticipated || '',
              additionalNotes: existingMember.additionalNotes || '',
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
    console.error('Error in public member registration form GET:', err);
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
      photoUrl,
      university,
      courseBranch,
      yearSemester,
      studentId,
      memberRole,
      domain,
      designation,
      memberId: inputMemberId,
      dateOfJoining,
      membershipStatus,
      skills,
      interests,
      linkedin,
      github,
      portfolio,
      speakerRoleType,
      speakingExperience,
      demoVideoUrl,
      speakingTopics,
      languages,
      eventAvailability,
      previousExperience,
      contributionAreas,
      assignedResponsibilities,
      majorAchievements,
      experience,
      certifications,
      digitalBadges,
      eventsParticipated,
      additionalNotes,
      bio,
      consent,
      customAnswers
    } = body;

    // 1. Personal Information Validation
    if (!fullName || !String(fullName).trim()) {
      return NextResponse.json(
        { error: 'Full Name is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!email || !String(email).trim() || !String(email).includes('@')) {
      return NextResponse.json(
        { error: 'A valid Email Address is required to record your member profile.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!phone || !String(phone).trim()) {
      return NextResponse.json(
        { error: 'Mobile / WhatsApp Number is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    // 2. Academic Information Validation
    if (!university || !String(university).trim()) {
      return NextResponse.json(
        { error: 'University / Institute Name is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    const effectiveCourseBranch = String(courseBranch || body.course || '').trim();
    if (!effectiveCourseBranch) {
      return NextResponse.json(
        { error: 'Course / Program is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!yearSemester || !String(yearSemester).trim()) {
      return NextResponse.json(
        { error: 'Year of Study is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }
    if (!studentId || !String(studentId).trim()) {
      return NextResponse.json(
        { error: 'Student ID / UID is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    // 3. AWS SBG Membership Validation
    const effectiveDomain = String(domain || 'Cloud & Infrastructure').trim();
    const effectiveRole = String(memberRole || 'General Member').trim();

    // 4. Skills & Professional Profile Validation
    if (!skills || !String(skills).trim()) {
      return NextResponse.json(
        { error: 'Primary Skills are required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(fullName).trim();
    const now = new Date().toISOString();

    // 5. Profile Photo Validation
    const existingMember = await db.foundingMembers.getByEmail(cleanEmail);
    const cleanPhoto =
      (photoUrl ? String(photoUrl).trim() : '') ||
      (existingMember?.photoUrl ? String(existingMember.photoUrl).trim() : '');

    if (!cleanPhoto) {
      return NextResponse.json(
        { error: 'Profile Photo is required for your official AWS SBG member profile.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    // 6. Consent Declaration Validation
    const isConsentGiven = consent === true || body.consentGiven === true;
    if (!isConsentGiven) {
      return NextResponse.json(
        { error: 'Declaration & Authorization Consent is required to submit your member profile.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    // Combine legacy experience if needed
    const combinedExperience = String(
      experience ||
        [previousExperience, contributionAreas, assignedResponsibilities, majorAchievements]
          .filter(Boolean)
          .join('\n\n') ||
        'AWS Student Builder Group Member Profile & Contributions'
    ).trim();

    let savedMemberId: string;
    let savedDbId: string;
    let isUpdate = false;

    if (existingMember) {
      // Update existing record
      isUpdate = true;
      savedDbId = existingMember.id;
      savedMemberId =
        (inputMemberId && String(inputMemberId).trim()) ||
        existingMember.memberId ||
        (await db.foundingMembers.getNextMemberId());

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
        photoUrl: cleanPhoto,
        university: String(university).trim(),
        courseBranch: effectiveCourseBranch,
        course: effectiveCourseBranch,
        yearSemester: String(yearSemester).trim(),
        studentId: String(studentId).trim(),
        memberRole: effectiveRole,
        role: effectiveRole,
        domain: effectiveDomain,
        designation: designation ? String(designation).trim() : existingMember.designation || effectiveRole,
        dateOfJoining: dateOfJoining ? String(dateOfJoining).trim() : existingMember.dateOfJoining || now.split('T')[0],
        membershipStatus: (membershipStatus as any) || existingMember.membershipStatus || 'Active',
        skills: String(skills).trim(),
        interests: interests ? String(interests).trim() : existingMember.interests || '',
        linkedin: linkedin ? String(linkedin).trim() : existingMember.linkedin || '',
        github: github ? String(github).trim() : existingMember.github || '',
        portfolio: portfolio ? String(portfolio).trim() : existingMember.portfolio || '',
        speakerRoleType: speakerRoleType ? String(speakerRoleType).trim() : existingMember.speakerRoleType || '',
        speakingExperience: speakingExperience ? String(speakingExperience).trim() : existingMember.speakingExperience || '',
        demoVideoUrl: demoVideoUrl ? String(demoVideoUrl).trim() : existingMember.demoVideoUrl || '',
        speakingTopics: speakingTopics ? String(speakingTopics).trim() : existingMember.speakingTopics || '',
        languages: languages ? String(languages).trim() : existingMember.languages || '',
        eventAvailability: eventAvailability ? String(eventAvailability).trim() : existingMember.eventAvailability || '',
        previousExperience: previousExperience ? String(previousExperience).trim() : existingMember.previousExperience || '',
        contributionAreas: contributionAreas ? String(contributionAreas).trim() : existingMember.contributionAreas || '',
        assignedResponsibilities: assignedResponsibilities ? String(assignedResponsibilities).trim() : existingMember.assignedResponsibilities || '',
        majorAchievements: majorAchievements ? String(majorAchievements).trim() : existingMember.majorAchievements || '',
        experience: combinedExperience,
        certifications: certifications ? String(certifications).trim() : existingMember.certifications || '',
        digitalBadges: digitalBadges ? String(digitalBadges).trim() : existingMember.digitalBadges || '',
        eventsParticipated: eventsParticipated ? String(eventsParticipated).trim() : existingMember.eventsParticipated || '',
        additionalNotes: additionalNotes ? String(additionalNotes).trim() : existingMember.additionalNotes || '',
        bio: bio ? String(bio).trim() : existingMember.bio || '',
        consentGiven: consent !== false,
        consentText:
          'I confirm that the information provided is accurate and up to date. I consent to its use for AWS Student Builder Group membership records, member verification, team coordination, event participation, recognition, certificates, digital badges, and related community activities.',
        customAnswers: mergedCustomAnswers,
        formSubmitted: true,
        formSubmittedAt: now,
        status: 'Active',
        updatedAt: now
      };

      await db.foundingMembers.updateOne(existingMember.id, updatePayload);
    } else {
      // Create new Member record with permanent memberId
      savedMemberId =
        (inputMemberId && String(inputMemberId).trim()) || (await db.foundingMembers.getNextMemberId());
      savedDbId = `fm-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      const newMember: FoundingMember = {
        id: savedDbId,
        memberId: savedMemberId,
        fullName: cleanName,
        name: cleanName,
        email: cleanEmail,
        phone: String(phone).trim(),
        photoUrl: cleanPhoto,
        university: String(university).trim(),
        courseBranch: effectiveCourseBranch,
        course: effectiveCourseBranch,
        yearSemester: String(yearSemester).trim(),
        studentId: String(studentId).trim(),
        memberRole: effectiveRole,
        role: effectiveRole,
        domain: effectiveDomain,
        designation: designation ? String(designation).trim() : effectiveRole,
        dateOfJoining: dateOfJoining ? String(dateOfJoining).trim() : now.split('T')[0],
        membershipStatus: (membershipStatus as any) || 'Active',
        skills: String(skills).trim(),
        interests: interests ? String(interests).trim() : '',
        linkedin: linkedin ? String(linkedin).trim() : '',
        github: github ? String(github).trim() : '',
        portfolio: portfolio ? String(portfolio).trim() : '',
        speakerRoleType: speakerRoleType ? String(speakerRoleType).trim() : '',
        speakingExperience: speakingExperience ? String(speakingExperience).trim() : '',
        demoVideoUrl: demoVideoUrl ? String(demoVideoUrl).trim() : '',
        speakingTopics: speakingTopics ? String(speakingTopics).trim() : '',
        languages: languages ? String(languages).trim() : '',
        eventAvailability: eventAvailability ? String(eventAvailability).trim() : '',
        previousExperience: previousExperience ? String(previousExperience).trim() : '',
        contributionAreas: contributionAreas ? String(contributionAreas).trim() : '',
        assignedResponsibilities: assignedResponsibilities ? String(assignedResponsibilities).trim() : '',
        majorAchievements: majorAchievements ? String(majorAchievements).trim() : '',
        experience: combinedExperience,
        certifications: certifications ? String(certifications).trim() : '',
        digitalBadges: digitalBadges ? String(digitalBadges).trim() : '',
        eventsParticipated: eventsParticipated ? String(eventsParticipated).trim() : '',
        additionalNotes: additionalNotes ? String(additionalNotes).trim() : '',
        bio: bio ? String(bio).trim() : '',
        consentGiven: consent !== false,
        consentText:
          'I confirm that the information provided is accurate and up to date. I consent to its use for AWS Student Builder Group membership records, member verification, team coordination, event participation, recognition, certificates, digital badges, and related community activities.',
        customAnswers: customAnswers || {},
        formSubmitted: true,
        formSubmittedAt: now,
        status: 'Active',
        notes: 'Submitted via AWS SBG Member Registration & Profile Form',
        createdAt: now,
        updatedAt: now
      };

      await db.foundingMembers.insertOne(newMember);
    }

    return NextResponse.json(
      {
        success: true,
        message: isUpdate
          ? `Member profile for ${cleanName} updated successfully!`
          : `Thank you for submitting your member profile. Your information has been received for AWS Student Builder Group records.`,
        memberId: savedMemberId,
        member: {
          id: savedDbId,
          memberId: savedMemberId,
          fullName: cleanName,
          email: cleanEmail,
          memberRole: effectiveRole,
          domain: effectiveDomain,
          formSubmittedAt: now
        }
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error processing member registration form submission:', err);
    return NextResponse.json(
      { error: err.message || 'Server error occurred while submitting form.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
