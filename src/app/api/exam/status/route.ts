import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
};

export async function GET() {
  try {
    const published = await db.settings.getExamPortalPublished();
    return NextResponse.json({ success: true, published }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Exam status fetch error:', err);
    return NextResponse.json(
      { success: false, published: false, error: err.message || 'Failed to fetch status' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
