import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, university, program, year, interests, experience, consent } = body;

    if (!name || !email || !university || !program || !year) {
      return NextResponse.json({ error: 'Missing required registration parameters.' }, { status: 400 });
    }

    const registrations = await db.registrations.getAll();
    const newReg = {
      id: `reg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      email,
      university,
      program,
      year,
      interests: interests || [],
      experience: experience || 'Beginner',
      consent: !!consent,
      status: 'New',
      date: new Date().toISOString(),
      notes: ''
    };

    registrations.push(newReg);
    await db.registrations.saveAll(registrations);

    // Push notification to Admin
    const notifications = await db.notifications.getAll();
    notifications.push({
      id: `notif-${Date.now()}`,
      type: 'registration',
      title: 'New Student Registration',
      description: `${name} has registered to join the community.`,
      status: 'unread',
      date: new Date().toISOString()
    });
    await db.notifications.saveAll(notifications);

    return NextResponse.json({ success: true, registrationId: newReg.id });
  } catch (err) {
    console.error('API Join Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
