import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthorizedAdmin, unauthorizedAdminResponse } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorizedAdmin(request)) {
    return unauthorizedAdminResponse();
  }

  const { id } = await params;
  const application = (await db.careerApplications.getAll()).find((item: any) => item.id === id);
  if (!application || application.resumeUrl !== `admin-resume:${id}`) {
    return NextResponse.json({ error: 'Resume not found.' }, { status: 404 });
  }

  const resumeFile = (await db.resumeFiles.getById(id)) || (await db.resumeFiles.getMap())[id];
  if (!resumeFile) {
    return NextResponse.json({ error: 'Resume file not found.' }, { status: 404 });
  }

  const download = new URL(request.url).searchParams.get('download') === '1';
  const safeFileName = resumeFile.fileName.replace(/[\r\n"\\]/g, '_');
  return new NextResponse(Buffer.from(resumeFile.data, 'base64'), {
    headers: {
      'Content-Type': resumeFile.mimeType || 'application/pdf',
      'Content-Length': String(resumeFile.size),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeFileName}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, no-store',
    },
  });
}