import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      eventId,
      fullName,
      email,
      phone,
      university,
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

    // Required fields check
    if (!eventId || !fullName || !email || !phone || !university || !program || !year || !linkedin || !github || !motivation || !consent) {
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

    // LinkedIn validation
    const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
    if (!linkedinRegex.test(linkedin)) {
      return NextResponse.json({ error: 'Invalid LinkedIn profile URL.' }, { status: 400 });
    }

    // GitHub validation
    const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/;
    if (!githubRegex.test(github)) {
      return NextResponse.json({ error: 'Invalid GitHub profile URL.' }, { status: 400 });
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
      notes: ''
    };

    regList.push(newReg);
    await db.eventRegistrations.saveAll(regList);

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

    return NextResponse.json({
      success: true,
      registrationId: regId,
      eventName: event.title
    });
  } catch (err) {
    console.error('API Event Register POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
