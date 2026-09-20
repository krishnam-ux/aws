import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  buildOpportunitySuccessUrl,
  hasDuplicateOpportunityApplication,
  isValidGoogleDriveUrl,
  isValidLinkedInUrl,
  getOpportunityFormType
} from '@/lib/opportunityApplication';
import { triggerOpportunityApplicationReceived } from '@/lib/email/automations';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const opportunityId = String(form.get('opportunityId') || '').trim();
    const opportunitySlug = String(form.get('opportunitySlug') || '').trim();
    let formType = String(form.get('formType') || '').trim();

    // Personal & Academic details
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const personalEmail = String(form.get('personalEmail') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    const university = String(form.get('university') || 'Chandigarh University – Uttar Pradesh').trim();
    const program = String(form.get('program') || '').trim();
    const department = String(form.get('department') || form.get('branch') || '').trim();
    const currentYear = String(form.get('currentYear') || '').trim();
    const graduationYear = String(form.get('graduationYear') || '').trim();
    const studentId = String(form.get('studentId') || form.get('rollNumber') || '').trim();

    // Professional links
    const linkedin = String(form.get('linkedin') || '').trim();
    const github = String(form.get('github') || '').trim();
    const portfolio = String(form.get('portfolio') || '').trim();

    // Domain & Role
    const preferredDomain = String(form.get('preferredDomain') || '').trim();
    const preferredRole = String(form.get('preferredRole') || '').trim();

    // Skills & Ratings
    const skills = String(form.get('skills') || '').trim();
    const primarySkillLevel = String(form.get('primarySkillLevel') || '').trim();

    // Experience & Responsibilities
    const experience = String(form.get('experience') || form.get('previousExperience') || '').trim();
    const roleAndImpact = String(form.get('roleAndImpact') || '').trim();
    const exactResponsibility = String(form.get('exactResponsibility') || '').trim();

    // Leadership & Teamwork
    const teamworkSituation = String(form.get('teamworkSituation') || '').trim();
    const leadershipExperience = String(form.get('leadershipExperience') || '').trim();
    const leadershipDetails = String(form.get('leadershipDetails') || '').trim();

    // Motivation & Contribution
    const rawMotivation = String(form.get('motivation') || '').trim();
    const whyFoundingMember = String(form.get('whyFoundingMember') || '').trim();
    const whyCoreTeam = String(form.get('whyCoreTeam') || '').trim();
    const personalContribution = String(form.get('personalContribution') || '').trim();
    const domainContribution = String(form.get('domainContribution') || '').trim();
    const communityGrowthIdeas = String(form.get('communityGrowthIdeas') || '').trim();

    // Scenarios
    const scenarioDropParticipation = String(form.get('scenarioDropParticipation') || '').trim();
    const scenarioUnavailableMembers = String(form.get('scenarioUnavailableMembers') || '').trim();

    // Availability & Commitment
    const availabilityHours = String(form.get('availabilityHours') || '').trim();
    const consistentContribution = String(form.get('consistentContribution') || '').trim();
    const contributionDuration = String(form.get('contributionDuration') || '').trim();
    const academicBalance = String(form.get('academicBalance') || '').trim();
    const availableDays = String(form.get('availableDays') || '').trim();
    const activeParticipation = String(form.get('activeParticipation') || '').trim();
    const involvementDuration = String(form.get('involvementDuration') || '').trim();

    // Other & Video
    const introductionVideoUrl = String(form.get('introductionVideoUrl') || form.get('videoUrl') || '').trim();
    const coverLetter = String(form.get('coverLetter') || '').trim();
    const additionalInformation = String(form.get('additionalInformation') || '').trim();
    const consent = form.get('consent') !== null;
    const resume = form.get('resume');

    // Retrieve opportunity to determine effective form type and validate status
    const allCareers = await db.careers.getAll();
    const opportunity = allCareers.find((item: any) => item.id === opportunityId || item.slug === opportunitySlug);
    if (!opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found.' }, { status: 404 });
    }

    if (!formType) {
      formType = getOpportunityFormType(opportunity.slug || opportunitySlug, opportunity.title);
    }

    const fieldErrors: Record<string, string> = {};

    // Common validations
    if (!name) fieldErrors.name = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = 'Please enter a valid email address.';
    if (!phone) fieldErrors.phone = 'Please enter your phone number.';
    if (!studentId) fieldErrors.studentId = 'Please enter your roll number / student ID.';
    if (!program) fieldErrors.program = 'Please enter your course / program.';
    if (!graduationYear) fieldErrors.graduationYear = 'Please enter your graduation year.';
    if (!consent) fieldErrors.consent = 'Please confirm the declaration to proceed.';

    // LinkedIn Profile is REQUIRED for EVERY opportunity
    if (!linkedin) {
      fieldErrors.linkedin = 'LinkedIn Profile is required.';
    } else if (!isValidLinkedInUrl(linkedin)) {
      fieldErrors.linkedin = 'Please enter a valid LinkedIn profile URL.';
    }

    if (formType === 'founding-member') {
      if (!department) fieldErrors.department = 'Please enter your branch / department.';
      if (!currentYear) fieldErrors.currentYear = 'Please select your current year.';
      if (!preferredDomain) fieldErrors.preferredDomain = 'Please select your preferred domain.';
      if (!skills) fieldErrors.skills = 'Please describe your skills and strengths.';
      if (!experience) fieldErrors.experience = 'Please describe your previous experience or projects.';
      if (!roleAndImpact) fieldErrors.roleAndImpact = 'Please describe your role and impact.';
      if (!whyFoundingMember) fieldErrors.whyFoundingMember = 'Please explain why you want to become a Founding Member.';
      if (!personalContribution) fieldErrors.personalContribution = 'Please explain what you can personally contribute.';
      if (!communityGrowthIdeas) fieldErrors.communityGrowthIdeas = 'Please share your ideas for community growth.';
      if (!availabilityHours) fieldErrors.availabilityHours = 'Please select your weekly availability.';
      if (!consistentContribution) fieldErrors.consistentContribution = 'Please select your consistency commitment.';
      if (!contributionDuration) fieldErrors.contributionDuration = 'Please select your expected contribution duration.';
      if (!academicBalance) fieldErrors.academicBalance = 'Please explain how you will balance academics.';
      if (!scenarioDropParticipation) fieldErrors.scenarioDropParticipation = 'Please provide your approach to this scenario.';
    } else if (formType === 'core-team') {
      if (!department) fieldErrors.department = 'Please enter your branch / department.';
      if (!currentYear) fieldErrors.currentYear = 'Please select your current year.';
      if (!preferredDomain) fieldErrors.preferredDomain = 'Please select your preferred domain.';
      if (!preferredRole) fieldErrors.preferredRole = 'Please select your preferred role.';
      if (!skills) fieldErrors.skills = 'Please describe your relevant skills.';
      if (!primarySkillLevel) fieldErrors.primarySkillLevel = 'Please rate your primary skill level.';
      if (!experience) fieldErrors.experience = 'Please describe your relevant experiences.';
      if (!exactResponsibility) fieldErrors.exactResponsibility = 'Please specify your exact responsibility.';
      if (!teamworkSituation) fieldErrors.teamworkSituation = 'Please describe a teamwork situation.';
      if (!leadershipExperience) fieldErrors.leadershipExperience = 'Please indicate your leadership experience.';
      if (leadershipExperience === 'Yes' && !leadershipDetails) {
        fieldErrors.leadershipDetails = 'Please provide details about what you organized or led.';
      }
      if (!whyCoreTeam) fieldErrors.whyCoreTeam = 'Please explain why you want to join the Core Team.';
      if (!domainContribution) fieldErrors.domainContribution = 'Please describe your contribution to your selected domain.';
      if (!scenarioUnavailableMembers) fieldErrors.scenarioUnavailableMembers = 'Please explain how you would handle this scenario.';
      if (!availabilityHours) fieldErrors.availabilityHours = 'Please select your weekly availability.';
      if (!availableDays) fieldErrors.availableDays = 'Please select your available days.';
      if (!activeParticipation) fieldErrors.activeParticipation = 'Please select your participation commitment.';
      if (!involvementDuration) fieldErrors.involvementDuration = 'Please select your expected involvement duration.';
    } else {
      // Anchor & Speaker or generic
      if (!university) fieldErrors.university = 'Please enter your university.';
      if (!introductionVideoUrl || !isValidGoogleDriveUrl(introductionVideoUrl)) {
        fieldErrors.introductionVideoUrl = 'Please provide a valid Google Drive sharing link for your introduction video.';
      }
      if (!skills) fieldErrors.skills = 'Please enter your skills.';
      if (!experience) fieldErrors.experience = 'Please enter your experience.';
      if (!rawMotivation) fieldErrors.motivation = 'Please explain why you want to join.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ success: false, error: 'Please correct the highlighted fields.', fieldErrors }, { status: 400 });
    }

    const isClosed = opportunity.status === 'Closed' || (opportunity.applicationDeadline && new Date(opportunity.applicationDeadline).getTime() < Date.now());
    if (!opportunity.published || isClosed || !opportunity.internalApplications) {
      return NextResponse.json({ success: false, error: 'Applications for this opportunity are closed.' }, { status: 403 });
    }

    const currentApplications = await db.careerApplications.getByOpportunityId(opportunity.id);
    if (opportunity.maxApplications && currentApplications.length >= Number(opportunity.maxApplications)) {
      return NextResponse.json({ success: false, error: 'Applications Closed — Maximum applications reached.' }, { status: 403 });
    }

    if (hasDuplicateOpportunityApplication(currentApplications, opportunity.id, email)) {
      return NextResponse.json({ success: false, error: 'You have already applied to this opportunity.' }, { status: 409 });
    }

    const applicationId = `career-app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let resumeUrl = '';

    if (resume instanceof File && resume.size > 0) {
      const allowedMimeTypes = new Set([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]);
      if (!allowedMimeTypes.has(resume.type)) {
        return NextResponse.json({ success: false, error: 'Resume must be a PDF, DOC, or DOCX file.' }, { status: 400 });
      }
      if (resume.size > 5 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: 'Resume must be 5MB or smaller.' }, { status: 400 });
      }

      const resumeFiles = await db.resumeFiles.getMap();
      resumeFiles[applicationId] = {
        data: Buffer.from(await resume.arrayBuffer()).toString('base64'),
        mimeType: resume.type,
        fileName: resume.name,
        size: resume.size,
      };
      await db.resumeFiles.saveMap(resumeFiles);
      resumeUrl = `admin-resume:${applicationId}`;
    }

    const effectiveMotivation = whyFoundingMember || whyCoreTeam || rawMotivation;
    const effectiveScenario = scenarioDropParticipation || scenarioUnavailableMembers || '';

    const submission = {
      id: applicationId,
      opportunityId: opportunity.id,
      opportunitySlug: opportunity.slug,
      formType,
      name,
      email,
      personalEmail,
      phone,
      university,
      program,
      department,
      branch: department,
      currentYear,
      graduationYear,
      studentId,
      rollNumber: studentId,
      linkedin,
      github,
      portfolio,
      resumeUrl,
      introductionVideoUrl,
      videoUrl: introductionVideoUrl,
      preferredDomain,
      preferredRole,
      skills,
      primarySkillLevel,
      experience,
      roleAndImpact,
      exactResponsibility,
      teamworkSituation,
      leadershipExperience,
      leadershipDetails,
      whyFoundingMember,
      whyCoreTeam,
      personalContribution,
      domainContribution,
      communityGrowthIdeas,
      scenarioAnswer: effectiveScenario,
      scenarioDropParticipation,
      scenarioUnavailableMembers,
      availabilityHours,
      consistentContribution,
      contributionDuration,
      academicBalance,
      availableDays,
      activeParticipation,
      involvementDuration,
      motivation: effectiveMotivation,
      coverLetter,
      additionalInformation,
      consent: true,
      status: 'New',
      adminNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.careerApplications.insertOne(submission);

    // Dispatch automated application acknowledgement email (isolated, non-blocking)
    try {
      await triggerOpportunityApplicationReceived({
        studentName: name,
        email,
        opportunity: {
          id: opportunity.id,
          title: opportunity.title,
          role: opportunity.opportunityType || opportunity.title,
          slug: opportunity.slug
        },
        applicationId
      });
    } catch (emailErr) {
      console.error('Non-blocking error dispatching career application email:', emailErr);
    }

    return NextResponse.redirect(buildOpportunitySuccessUrl(request.url, opportunity.slug, request.headers), 303);
  } catch (error) {
    console.error('Career application insert failed:', error);
    return NextResponse.json({ success: false, error: 'Database transaction failed. Your application was not submitted.' }, { status: 500 });
  }
}
