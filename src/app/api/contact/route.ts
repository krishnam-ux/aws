import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, organization, type, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required message parameters.' }, { status: 400 });
    }

    const collaborations = db.collaborationRequests.getAll();
    const newRequest = {
      id: `collab-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      email,
      organization: organization || 'Individual / Student',
      type: type || 'General Inquiry', // Collaboration Type
      message,
      status: 'New', // Status: New, Contacted, In Discussion, Completed, Rejected
      date: new Date().toISOString()
    };

    collaborations.push(newRequest);
    db.collaborationRequests.saveAll(collaborations);

    // Push notification to Admin
    const notifications = db.notifications.getAll();
    notifications.push({
      id: `notif-${Date.now()}`,
      type: 'collaboration',
      title: 'New Collaboration Request',
      description: `${name} has sent a collaboration proposal.`,
      status: 'unread',
      date: new Date().toISOString()
    });
    db.notifications.saveAll(notifications);

    return NextResponse.json({ success: true, requestId: newRequest.id });
  } catch (err) {
    console.error('API Contact Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
