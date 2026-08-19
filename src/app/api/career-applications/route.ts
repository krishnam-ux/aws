import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildOpportunitySuccessUrl, hasDuplicateOpportunityApplication } from '@/lib/opportunityApplication';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const opportunityId = String(form.get('opportunityId') || '');
    const opportunitySlug = String(form.get('opportunitySlug') || '');
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    const university = String(form.get('university') || '').trim();
    const program = String(form.get('program') || '').trim();
    const graduationYear = String(form.get('graduationYear') || '').trim();
    const studentId = String(form.get('studentId') || '').trim();
    const linkedin = String(form.get('linkedin') || '').trim();
    const github = String(form.get('github') || '').trim();
    const portfolio = String(form.get('portfolio') || '').trim();
    const skills = String(form.get('skills') || '').trim();
    const experience = String(form.get('experience') || '').trim();
    const motivation = String(form.get('motivation') || '').trim();
    const coverLetter = String(form.get('coverLetter') || '').trim();
    const additionalInformation = String(form.get('additionalInformation') || '').trim();
    const consent = form.get('consent') !== null;
    const resume = form.get('resume');

    const fieldErrors: Record<string, string> = {};
    if (!name) fieldErrors.name = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = 'Please enter a valid email address.';
    if (!phone) fieldErrors.phone = 'Please enter your phone number.';
    if (!university) fieldErrors.university = 'Please enter your university.';
    if (!program) fieldErrors.program = 'Please enter your course or program.';
    if (!graduationYear) fieldErrors.graduationYear = 'Please enter your year.';
    if (!studentId) fieldErrors.studentId = 'Please enter your student ID.';
    if (!(resume instanceof File) || resume.size === 0) fieldErrors.resume = 'Please upload your resume/CV.';
    if (!linkedin) fieldErrors.linkedin = 'Please enter your LinkedIn profile URL.';
    if (!github) fieldErrors.github = 'Please enter your GitHub profile URL.';
    if (!skills) fieldErrors.skills = 'Please enter your skills.';
    if (!experience) fieldErrors.experience = 'Please enter your experience.';
    if (!motivation) fieldErrors.motivation = 'Please explain why you want to join.';
    if (!consent) fieldErrors.consent = 'Please confirm your consent to be considered.';

    if (!opportunityId || Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ success: false, error: 'Please correct the highlighted fields.', fieldErrors }, { status: 400 });
    }

    const career = await db.careers.getAll();
    const opportunity = career.find((item: any) => item.id === opportunityId || item.slug === opportunitySlug);
    if (!opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found.' }, { status: 404 });
    }

    const isClosed = opportunity.status === 'Closed' || (opportunity.applicationDeadline && new Date(opportunity.applicationDeadline).getTime() < Date.now());
    if (!opportunity.published || isClosed || !opportunity.internalApplications) {
      return NextResponse.json({ success: false, error: 'Applications for this opportunity are closed.' }, { status: 403 });
    }

    const currentApplications = await db.careerApplications.getByOpportunityId(opportunityId);
    if (opportunity.maxApplications && currentApplications.length >= Number(opportunity.maxApplications)) {
      return NextResponse.json({ success: false, error: 'Applications Closed — Maximum applications reached.' }, { status: 403 });
    }

    if (hasDuplicateOpportunityApplication(currentApplications, opportunityId, email)) {
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

    const submission = {
      id: applicationId,
      opportunityId,
      name,
      email,
      phone,
      university,
      program,
      graduationYear,
      studentId,
      resumeUrl,
      linkedin,
      github,
      portfolio,
      skills,
      experience,
      motivation,
      coverLetter,
      additionalInformation,
      consent: true,
      status: 'New',
      adminNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.careerApplications.insertOne(submission);

    return NextResponse.redirect(buildOpportunitySuccessUrl(request.url, opportunity.slug, request.headers), 303);
  } catch (error) {
    console.error('Career application insert failed:', error);
    return NextResponse.json({ success: false, error: 'Database transaction failed. Your application was not submitted.' }, { status: 500 });
  }
}
