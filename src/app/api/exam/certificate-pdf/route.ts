import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateCertificatePdfBuffer, getCertificateFileName } from '@/lib/certificates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');
    const token = searchParams.get('token');
    const certificateIdParam = searchParams.get('certificateId');

    let certificate: any = null;
    let studentName = '';
    let eventName = 'AWS Certification Exam';

    if (attemptId && token) {
      const attempt = await db.examAttempts.getById(attemptId);
      if (!attempt || attempt.sessionToken !== token) {
        return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
      }

      if (!attempt.passed || !attempt.certificateId) {
        return NextResponse.json({ error: 'No certificate issued for this attempt.' }, { status: 404 });
      }

      certificate = await db.certificates.getByCertificateId(attempt.certificateId);
      studentName = attempt.studentName;
      const exam = await db.exams.getById(attempt.examId);
      if (exam) {
        eventName = `${exam.title} Certification`;
      }
    } else if (certificateIdParam) {
      certificate = await db.certificates.getByCertificateId(certificateIdParam);
      if (!certificate) {
        return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 });
      }
      studentName = certificate.studentName;
      eventName = certificate.eventName;
    } else {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate record not found.' }, { status: 404 });
    }

    const pdfBuffer = await generateCertificatePdfBuffer({
      studentName: certificate.studentName || studentName,
      eventName: certificate.eventName || eventName,
      eventDate: certificate.eventDate || certificate.issueDate || new Date().toISOString().slice(0, 10),
      venue: certificate.venue || 'Chandigarh University – Uttar Pradesh',
      certificateId: certificate.certificateId,
      description: `For successfully passing the ${certificate.eventName || eventName} Assessment with outstanding merit.`
    });

    const fileName = getCertificateFileName(certificate.studentName || studentName, certificate.certificateId);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('Certificate PDF download error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate certificate PDF.' }, { status: 500 });
  }
}
