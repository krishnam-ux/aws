import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  return request.headers.get('Authorization') === `Bearer ${SECURE_TOKEN}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 401 });
  }

  const { id } = await params;
  const application = (await db.careerApplications.getAll()).find((item: any) => item.id === id);
  if (!application || application.resumeUrl !== `admin-resume:${id}`) {
    return NextResponse.json({ error: 'Resume not found.' }, { status: 404 });
  }

  const resumeFile = (await db.resumeFiles.getMap())[id];
  if (!resumeFile) {
    return NextResponse.json({ error: 'Resume file not found.' }, { status: 404 });
  }

  const download = new URL(request.url).searchParams.get('download') === '1';
  const safeFileName = resumeFile.fileName.replace(/[\r\n"\\]/g, '_');
  return new NextResponse(Buffer.from(resumeFile.data, 'base64'), {
    headers: {
      'Content-Type': resumeFile.mimeType,
      'Content-Length': String(resumeFile.size),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeFileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}