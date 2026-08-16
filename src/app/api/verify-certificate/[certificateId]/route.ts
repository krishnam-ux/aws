import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  const { certificateId } = await params;

  try {
    const certificate = await db.certificates.getByCertificateId(decodeURIComponent(certificateId));
    if (!certificate) {
      return NextResponse.json({ status: 'Not Found' }, { status: 404 });
    }

    if (certificate.status === 'Revoked') {
      return NextResponse.json({ status: 'Revoked', certificateId: certificate.certificateId }, { status: 410 });
    }

    return NextResponse.json({
      status: 'Valid',
      certificateId: certificate.certificateId,
      studentName: certificate.studentName,
      eventName: certificate.eventName,
      eventDate: certificate.eventDate,
      venue: certificate.venue,
      issuedBy: 'AWS Student Builder Group',
      issueDate: certificate.issueDate
    });
  } catch (error) {
    console.error('Verification lookup failed:', error);
    return NextResponse.json({ status: 'Not Found' }, { status: 404 });
  }
}
