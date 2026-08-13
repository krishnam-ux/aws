import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, organization, type, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required message parameters.' }, { status: 400 });
    }

    const messages = await db.contactMessages.getAll();
    const newMsg = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      email,
      subject: type || 'General Inquiry',
      message,
      status: 'NEW', // Default status: NEW
      date: new Date().toISOString()
    };

    messages.push(newMsg);
    await db.contactMessages.saveAll(messages);

    // Push notification to Admin
    const notifications = await db.notifications.getAll();
    notifications.push({
      id: `notif-${Date.now()}`,
      type: 'contact',
      title: 'New Contact Message',
      description: `New message from ${name}: "${newMsg.subject}"`,
      status: 'unread',
      date: new Date().toISOString()
    });
    await db.notifications.saveAll(notifications);

    return NextResponse.json({ success: true, requestId: newMsg.id });
  } catch (err) {
    console.error('API Contact Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
