import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const careers = await db.careers.getAll();
    const publicCareers = careers
      .filter((career: any) => career.published && (career.status || '').toLowerCase() !== 'draft' && (career.status || '').toLowerCase() !== 'unpublished')
      .map((career: any) => ({
        id: career.id,
        slug: career.slug,
        title: career.title,
        organizationName: career.organizationName || career.organization_name,
        organizationLogo: career.organizationLogo || '',
        opportunityType: career.opportunityType,
        location: career.location,
        workMode: career.workMode,
        shortDescription: career.shortDescription,
        applicationDeadline: career.applicationDeadline,
        status: career.status,
        published: Boolean(career.published),
        createdAt: career.createdAt
      }));

    return NextResponse.json({ success: true, careers: publicCareers }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  } catch (error) {
    console.error('Careers public GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
