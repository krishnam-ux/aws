import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSEBConfigXml } from '@/lib/exam';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID is required.' }, { status: 400 });
    }

    const exam = await db.exams.getById(examId);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    }

    const host = request.headers.get('host') || 'www.awssbgcuup.tech';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const siteUrl = `${proto}://${host}`;

    const sebXml = generateSEBConfigXml(exam, siteUrl);
    const fileName = `AWS-SBG-${(exam.examCode || exam.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.seb`;

    // Server-side audit logging for SEB config generation
    console.info('[SEB_CONFIG_GENERATED]', {
      examId: exam.id,
      examCode: exam.examCode,
      examTitle: exam.title,
      startUrl: `${siteUrl}/exam`,
      configVersion: '1.0',
      timestamp: new Date().toISOString(),
      host,
      siteUrl
    });

    return new NextResponse(sebXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/seb',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('SEB config error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate SEB configuration.' }, { status: 500 });
  }
}
