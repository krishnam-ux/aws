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

    if (!opportunityId || !name || !email || !phone || !university || !program || !graduationYear || !studentId || !skills || !motivation || !consent) {
      return NextResponse.json({ success: false, error: 'Please fill in all required fields.' }, { status: 400 });
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
      resumeUrl: '',
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

    return NextResponse.redirect(buildOpportunitySuccessUrl(request.url, opportunity.slug, request.headers));
  } catch (error) {
    console.error('Career application insert failed:', error);
    return NextResponse.json({ success: false, error: 'Database transaction failed. Your application was not submitted.' }, { status: 500 });
  }
}
