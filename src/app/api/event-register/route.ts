import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateEventRegistrationInput } from '@/lib/eventRegistrationValidation';
import { triggerEventRegistrationConfirmation } from '@/lib/email/automations';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      eventId,
      fullName,
      email,
      phone,
      university,
      customUniversity,
      program,
      year,
      studentId,
      interests,
      experienceLevel,
      linkedin,
      github,
      motivation,
      consent
    } = body;

    const validation = validateEventRegistrationInput({
      eventId,
      fullName,
      email,
      phone,
      university,
      customUniversity,
      program,
      year,
      studentId,
      interests,
      experienceLevel,
      linkedin,
      github,
      motivation,
      consent,
    });

    if (!validation.valid) {
      return NextResponse.json({
        error: Object.values(validation.errors)[0] || 'Missing required registration parameters.'
      }, { status: 400 });
    }

    if (!eventId || !year) {
      return NextResponse.json({ error: 'Missing required registration parameters.' }, { status: 400 });
    }

    // Interests check
    if (!interests || (Array.isArray(interests) && interests.length === 0)) {
      return NextResponse.json({ error: 'Please select at least one technical interest.' }, { status: 400 });
    }

    // Phone validation
    const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: 'Invalid mobile number format.' }, { status: 400 });
    }

    // Find the event
    const events = await db.events.getAll();
    const event = events.find(e => e.id === eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    // Check if event status allows public visibility
    if (event.status === 'Draft' || event.status === 'Unpublished') {
      return NextResponse.json({ error: 'Event is not publicly visible.' }, { status: 400 });
    }

    // Check if registration status is open
    if (event.registrationStatus !== 'Open') {
      return NextResponse.json({ error: 'Registration for this event is not open.' }, { status: 400 });
    }

    const regList = await db.eventRegistrations.getAll();

    // Check for duplicates (same email + same event)
    const duplicate = regList.find(r => r.eventId === eventId && r.email.toLowerCase() === email.toLowerCase());
    if (duplicate) {
      return NextResponse.json({ error: 'You have already registered for this event.' }, { status: 400 });
    }

    // Check capacity limit
    if (event.maxRegistrations && event.maxRegistrations > 0) {
      const activeRegs = regList.filter(r => r.eventId === eventId && r.status !== 'Rejected' && r.status !== 'Cancelled');
      if (activeRegs.length >= event.maxRegistrations) {
        return NextResponse.json({ error: 'REGISTRATION FULL' }, { status: 400 });
      }
    }

    // Create the registration record
    const regId = `reg-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReg = {
      id: regId,
      eventId,
      eventName: event.title,
      name: fullName,
      email,
      phone: phone || '',
      university,
      program,
      year,
      studentId: studentId || '',
      interests: Array.isArray(interests) ? interests : [interests],
      experienceLevel: experienceLevel || 'Beginner',
      linkedin: linkedin || '',
      github: github || '',
      motivation: motivation || '',
      consent: !!consent,
      date: new Date().toISOString(),
      status: 'New',
      attendance: 'Registered',
      certificateId: null,
      notes: ''
    };

    try {
      await db.eventRegistrations.insertOne(newReg);
    } catch (dbErr: unknown) {
      console.error('API Event Register DB Insert Error:', dbErr);
      return NextResponse.json({
        success: false,
        error: 'Database transaction failed. Your registration was not recorded.'
      }, { status: 500 });
    }

    // Create Admin notification
    const notifications = await db.notifications.getAll();
    notifications.push({
      id: `notif-${Date.now()}`,
      title: 'New Event Registration',
      description: `${fullName} registered for ${event.title}.`,
      date: new Date().toISOString(),
      status: 'unread'
    });
    await db.notifications.saveAll(notifications);

    // Dispatch automated confirmation email (isolated, non-blocking)
    try {
      await triggerEventRegistrationConfirmation({
        studentName: fullName,
        email,
        event: {
          id: event.id,
          title: event.title,
          date: event.date,
          time: event.time,
          venue: event.venue,
          mode: event.mode
        },
        registrationId: regId
      });
    } catch (emailErr) {
      console.error('Non-blocking error dispatching event registration email:', emailErr);
    }

    // Automatic Exam Candidate Credential Provisioning:
    // If the registered event is an assessment/exam or linked to an exam, auto-generate candidate credentials
    try {
      const allExams = await db.exams.getAll();
      if (allExams.length > 0) {
        const linkedExam = allExams.find(
          (ex: any) =>
            ex.id === event.id ||
            ex.title?.toLowerCase().trim() === event.title?.toLowerCase().trim() ||
            ex.examCode?.toLowerCase().trim() === event.id?.toLowerCase().trim() ||
            event.category === 'Exam' ||
            event.category === 'Certification' ||
            event.title?.toLowerCase().includes('exam') ||
            event.title?.toLowerCase().includes('certification')
        ) || allExams[0];

        if (linkedExam) {
          const { provisionExamCandidate } = await import('@/lib/exam');
          await provisionExamCandidate({
            examId: linkedExam.id,
            studentName: fullName,
            rollNumber: studentId || `CU-${Date.now().toString().slice(-6)}`,
            email
          });
        }
      }
    } catch (candErr) {
      console.error('Non-blocking candidate credential provisioning error:', candErr);
    }

    return NextResponse.json({
      success: true,
      registrationId: regId,
      eventName: event.title,
      studentId: studentId || ''
    });
  } catch (error: any) {
    console.error('Event registration error:', error);
    return NextResponse.json({ error: error.message || 'Server error occurred during registration.' }, { status: 500 });
  }
}
