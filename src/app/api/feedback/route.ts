import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const events = await db.events.getAll();
    // Only return public events (not Draft or Unpublished)
    const publicEvents = events
      .filter(e => e.status !== 'Draft' && e.status !== 'Unpublished')
      .map(e => ({ id: e.id, title: e.title }));
    return NextResponse.json({ success: true, events: publicEvents });
  } catch (err) {
    console.error('API Feedback GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      university,
      eventId,
      rating,
      experience,
      feedback,
      liked,
      improvements,
      recommendation
    } = body;

    // Required fields check
    if (!name || !email || !university || !rating || !feedback) {
      return NextResponse.json({ error: 'Missing required feedback fields.' }, { status: 400 });
    }

    // Rating check
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Invalid rating. Please select between 1 and 5 stars.' }, { status: 400 });
    }

    // Verify email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address format.' }, { status: 400 });
    }

    // Verify the event if eventId is provided
    let eventTitle = 'General Community / Others';
    if (eventId) {
      const events = await db.events.getAll();
      const event = events.find(e => e.id === eventId);
      if (!event) {
        return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
      }
      eventTitle = event.title;
    }

    // Generate unique feedback ID
    const feedbackId = `feedback-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newFeedback = {
      id: feedbackId,
      eventId: eventId || null,
      name,
      email,
      university: university || '',
      rating: ratingNum,
      experience: experience || 'Good',
      feedback,
      liked: liked || '',
      improvements: improvements || '',
      recommendation: recommendation || 'Yes',
      status: 'New',
      adminNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await db.feedback.insertOne(newFeedback);
    } catch (dbErr: any) {
      console.error('API Feedback DB Insert Error:', dbErr);
      return NextResponse.json({
        success: false,
        error: 'Database transaction failed. Your feedback was not recorded.'
      }, { status: 500 });
    }

    // Create Admin notification
    try {
      const notifications = await db.notifications.getAll();
      notifications.push({
        id: `notif-${Date.now()}`,
        title: 'New Event Feedback',
        description: `${name} submitted feedback for "${eventTitle}".`,
        date: new Date().toISOString(),
        status: 'unread'
      });
      await db.notifications.saveAll(notifications);
    } catch (notifErr) {
      console.error('Failed to save feedback notification:', notifErr);
    }

    return NextResponse.json({
      success: true,
      feedbackId,
      eventTitle
    });
  } catch (err) {
    console.error('API Feedback POST Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
