import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const feedbacks = await db.feedback.getAll();
    return NextResponse.json({ success: true, count: feedbacks.length, feedbacks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
