import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);
  return token === SECURE_TOKEN;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const feedbacks = await db.feedback.getAll();
    const item = feedbacks.find(f => f.id === id);

    if (!item) {
      return NextResponse.json({ error: 'Feedback record not found.' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (err) {
    console.error('API Admin Feedback Item GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
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
      recommendation,
      status,
      adminNotes
    } = body;

    const feedbacks = await db.feedback.getAll();
    const item = feedbacks.find(f => f.id === id);
    if (!item) {
      return NextResponse.json({ error: 'Feedback record not found.' }, { status: 404 });
    }

    // Required fields check (if provided for update, let's validate them)
    if (name === '' || email === '' || rating === '' || feedback === '') {
      return NextResponse.json({ error: 'Fields name, email, rating, and feedback cannot be empty.' }, { status: 400 });
    }

    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return NextResponse.json({ error: 'Invalid rating. Must be between 1 and 5 stars.' }, { status: 400 });
      }
    }

    // Prepare update parameters
    const fieldsToUpdate: any = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (email !== undefined) fieldsToUpdate.email = email;
    if (university !== undefined) fieldsToUpdate.university = university;
    if (eventId !== undefined) fieldsToUpdate.eventId = eventId;
    if (rating !== undefined) fieldsToUpdate.rating = Number(rating);
    if (experience !== undefined) fieldsToUpdate.experience = experience;
    if (feedback !== undefined) fieldsToUpdate.feedback = feedback;
    if (liked !== undefined) fieldsToUpdate.liked = liked;
    if (improvements !== undefined) fieldsToUpdate.improvements = improvements;
    if (recommendation !== undefined) fieldsToUpdate.recommendation = recommendation;
    if (status !== undefined) fieldsToUpdate.status = status;
    if (adminNotes !== undefined) fieldsToUpdate.adminNotes = adminNotes;

    try {
      await db.feedback.updateOne(id, fieldsToUpdate);
    } catch (dbErr: any) {
      console.error('API Admin Feedback Item Update DB Error:', dbErr);
      return NextResponse.json({ error: 'Database update failed.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Admin Feedback Item PUT Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const feedbacks = await db.feedback.getAll();
    const item = feedbacks.find(f => f.id === id);
    if (!item) {
      return NextResponse.json({ error: 'Feedback record not found.' }, { status: 404 });
    }

    try {
      await db.feedback.deleteOne(id);
    } catch (dbErr: any) {
      console.error('API Admin Feedback Item Delete DB Error:', dbErr);
      return NextResponse.json({ error: 'Database deletion failed.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Admin Feedback Item DELETE Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
