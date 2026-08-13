import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, organization, reason, details } = body;

    if (!name || !email || !organization || !reason) {
      return NextResponse.json({ error: 'Missing required request parameters.' }, { status: 400 });
    }

    const requests = await db.verificationRequests.getAll();
    const newRequest = {
      id: `ver-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      email,
      organization,
      reason,
      details: details || '',
      status: 'New', // Status: New, Under Review, Verified, Rejected
      date: new Date().toISOString(),
      notes: ''
    };

    requests.push(newRequest);
    await db.verificationRequests.saveAll(requests);

    // Push notification to Admin
    const notifications = await db.notifications.getAll();
    notifications.push({
      id: `notif-${Date.now()}`,
      type: 'verification',
      title: 'New Verification Request',
      description: `${name} (${organization}) has submitted a verification check.`,
      status: 'unread',
      date: new Date().toISOString()
    });
    await db.notifications.saveAll(notifications);

    return NextResponse.json({ success: true, requestId: newRequest.id });
  } catch (err) {
    console.error('API Verification Request Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
