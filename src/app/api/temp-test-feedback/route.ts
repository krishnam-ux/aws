import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthorizedAdmin, unauthorizedAdminResponse } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return unauthorizedAdminResponse();
  }

  try {
    const feedbacks = await db.feedback.getAll();
    return NextResponse.json({ success: true, count: feedbacks.length, feedbacks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
