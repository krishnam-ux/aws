import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { isAuthorizedAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  return isAuthorizedAdmin(request);
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const feedbacks = await db.feedback.getAll();
    return NextResponse.json(feedbacks, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  } catch (err) {
    console.error('API Admin Feedback GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  }
}
