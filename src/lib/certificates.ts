import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const { jsPDF } = require('jspdf');

import { db } from '@/lib/db';

export const ATTENDANCE_OPTIONS = ['Registered', 'Present', 'Attended', 'Absent'] as const;

export function normalizeAttendanceStatus(value?: string): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'attended' || normalized === 'present') return 'Attended';
  if (normalized === 'absent') return 'Absent';
  return 'Registered';
}

export function isCertificateEligible(registration: Partial<{ attendance?: string; status?: string }>): boolean {
  const normalizedAttendance = normalizeAttendanceStatus(registration.attendance);
  const normalizedStatus = normalizeAttendanceStatus(registration.status);

  return normalizedAttendance === 'Attended' || normalizedStatus === 'Attended';
}

export function getCertificateFileName(studentName: string, certificateId: string): string {
  const safeStudent = String(studentName || 'Student')
    .trim()
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
  return `AWS-SBG-CUUP-Certificate-${safeStudent}-${certificateId}.pdf`;
}

export async function generateCertificateId(registrationId?: string, eventId?: string, studentName?: string): Promise<string> {
  const year = new Date().getFullYear();
  const seed = String(registrationId || eventId || studentName || `aws-sbg-${Date.now()}`);
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const numeric = parseInt(hash.slice(0, 12), 16) % 900000 + 100000;
  return `AWS-SBG-CUUP-${year}-${String(numeric).padStart(6, '0')}`;
}

export function deriveCertificateMeta(
  registration: any,
  event: Partial<{ title?: string; date?: string; venue?: string; time?: string; endTime?: string }> = {}
) {
  const issueDate = new Date().toISOString().slice(0, 10);
  const eventName = String(event.title || registration.eventName || registration.eventTitle || 'AWS Event');
  const eventDate = String(event.date || registration.eventDate || registration.date || '').trim();
  const venue = String(event.venue || registration.venue || registration.eventVenue || 'Chandigarh University – Uttar Pradesh').trim();
  const duration = String(event.time || registration.time || event.endTime || '').trim();
  const orgName = 'AWS Student Builder Group';
  const certificateId = `AWS-SBG-CUUP-${new Date().getFullYear()}-000001`;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.awssbgcuup.tech';
  const verificationUrl = `${baseUrl}/verify-certificate/${certificateId}`;

  return {
    studentName: String(registration.name || registration.fullName || 'Student').trim(),
    eventName,
    eventDate: eventDate ? new Date(eventDate).toISOString().slice(0, 10) : issueDate,
    venue,
    duration,
    organizationName: orgName,
    organizationAddress: 'Chandigarh University – Uttar Pradesh',
    issueDate,
    certificateId,
    qrUrl: verificationUrl,
    verificationUrl,
    issuedBy: 'AWS Student Builder Group',
    status: 'Valid'
  };
}

export async function createCertificateRecord(registration: any, event: any, certificateId?: string) {
  const resolvedId = certificateId || (await generateCertificateId(registration?.id, registration?.eventId, registration?.name));
  const meta = deriveCertificateMeta(registration, event);
  const finalMeta = {
    ...meta,
    certificateId: resolvedId,
    qrUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.awssbgcuup.tech'}/verify-certificate/${resolvedId}`,
    verificationUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.awssbgcuup.tech'}/verify-certificate/${resolvedId}`,
    eventId: registration.eventId || event?.id,
    registrationId: registration.id
  };

  return {
    ...finalMeta,
    studentName: finalMeta.studentName,
    eventName: finalMeta.eventName,
    eventDate: finalMeta.eventDate,
    venue: finalMeta.venue,
    duration: finalMeta.duration,
    issueDate: finalMeta.issueDate,
    certificateId: finalMeta.certificateId,
    qrUrl: finalMeta.qrUrl,
    verificationUrl: finalMeta.verificationUrl,
    status: 'Valid'
  };
}

function drawWrappedTextBlock(
  doc: any,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    font: string;
    style: string;
    minSize?: number;
    maxSize?: number;
    color?: [number, number, number];
    lineHeight?: number;
    align?: 'left' | 'center' | 'right';
  }
) {
  const minSize = options.minSize ?? 12;
  const maxSize = options.maxSize ?? 32;
  const lineHeight = options.lineHeight ?? 1.2;
  const textValue = String(text || '').trim() || ' ';

  let chosenSize = maxSize;
  let lines: string[] = [];

  for (let size = maxSize; size >= minSize; size -= 1) {
    doc.setFont(options.font, options.style);
    doc.setFontSize(size);
    const candidate = doc.splitTextToSize(textValue, width);
    const requiredHeight = candidate.length * size * lineHeight;
    if (requiredHeight <= height) {
      lines = candidate;
      chosenSize = size;
      break;
    }
  }

  if (lines.length === 0) {
    doc.setFont(options.font, options.style);
    doc.setFontSize(minSize);
    lines = doc.splitTextToSize(textValue, width);
    chosenSize = minSize;
  }

  doc.setTextColor(...(options.color ?? [29, 20, 52]));
  doc.setFont(options.font, options.style);
  doc.setFontSize(chosenSize);

  const lineGap = chosenSize * lineHeight;
  const totalHeight = lines.length * lineGap;
  const startY = y + Math.max(0, (height - totalHeight) / 2);

  lines.forEach((line, index) => {
    const lineY = startY + index * lineGap;
    doc.text(line, x + (options.align === 'center' ? width / 2 : options.align === 'right' ? width : 0), lineY, {
      align: options.align ?? 'left',
      baseline: 'alphabetic'
    });
  });
}

export async function generateCertificatePdfBuffer(payload: any): Promise<Buffer> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const purple = [164, 78, 216];
  const lightGray = [243, 243, 243];
  const dark = [25, 20, 40];

  doc.setFillColor(...lightGray);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  for (let x = 0; x <= pageWidth; x += 32) {
    doc.setDrawColor(227, 227, 227);
    doc.line(x, 0, x, pageHeight);
  }
  for (let y = 0; y <= pageHeight; y += 32) {
    doc.setDrawColor(227, 227, 227);
    doc.line(0, y, pageWidth, y);
  }

  doc.setFillColor(...purple);
  doc.rect(0, 0, 28, 28, 'F');
  doc.rect(0, pageHeight - 28, 28, 28, 'F');
  doc.rect(pageWidth - 28, 0, 28, 28, 'F');
  doc.rect(pageWidth - 28, pageHeight - 28, 28, 28, 'F');

  doc.setFillColor(...lightGray);
  doc.rect(0, 0, 12, 12, 'F');
  doc.rect(pageWidth - 12, 0, 12, 12, 'F');
  doc.rect(0, pageHeight - 12, 12, 12, 'F');
  doc.rect(pageWidth - 12, pageHeight - 12, 12, 12, 'F');

  doc.setFillColor(...purple);
  doc.rect(28, 28, 548, 332, 'F');

  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(70);
  doc.text('Certificate', 80, 170);

  doc.setFont('times', 'normal');
  doc.setFontSize(20);
  doc.text('AWS Student Builder Group at', 82, 232);

  doc.setFont('times', 'bold');
  doc.setFontSize(23);
  doc.text('Chandigarh University – Uttar Pradesh', 82, 270);

  const cuLogoPath = path.join(process.cwd(), 'public', 'chandigarh-university-logo.jpg');
  if (fs.existsSync(cuLogoPath)) {
    const cuLogo = fs.readFileSync(cuLogoPath);
    doc.addImage(cuLogo, 'JPEG', 570, 42, 170, 70);
  } else {
    doc.setFillColor(220, 32, 34);
    doc.rect(570, 42, 170, 70, 'F');
    doc.setFillColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CHANDIGARH', 588, 62);
    doc.text('UNIVERSITY', 597, 82);
  }

  doc.setFillColor(11, 16, 21);
  doc.rect(890, 42, 112, 70, 'F');
  doc.setFillColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(27);
  doc.text('aws', 946, 82, { align: 'center' });

  const trophyX = 155;
  const trophyY = 410;
  const trophyCells = [
    [79, 16, 32, 18], [63, 34, 64, 22], [50, 56, 88, 18], [48, 74, 92, 22],
    [38, 96, 112, 18], [48, 114, 92, 18], [63, 132, 64, 18], [71, 150, 48, 16],
    [79, 166, 32, 18], [71, 184, 48, 12]
  ];
  doc.setFillColor(...purple);
  trophyCells.forEach(([x, y, w, h]) => doc.rect(trophyX + x, trophyY + y, w, h, 'F'));

  doc.setFillColor(...purple);
  doc.rect(760, 150, 134, 126, 'F');
  doc.setFillColor(245, 245, 245);
  doc.rect(778, 170, 98, 22, 'F');
  doc.rect(774, 206, 106, 18, 'F');
  doc.rect(782, 232, 90, 18, 'F');

  const rightX = 640;
  const rightY = 440;

  drawWrappedTextBlock(doc, 'Proudly present to', rightX, rightY - 8, 196, 34, {
    font: 'times',
    style: 'italic',
    minSize: 16,
    maxSize: 26,
    color: [25, 20, 40],
    align: 'center'
  });

  const studentName = String(payload.studentName || payload.name || 'Student Name').trim() || 'Student Name';
  drawWrappedTextBlock(doc, studentName, rightX, rightY + 24, 196, 70, {
    font: 'times',
    style: 'bold',
    minSize: 18,
    maxSize: 34,
    color: [25, 20, 40],
    lineHeight: 1.08,
    align: 'center'
  });

  drawWrappedTextBlock(doc, 'For outstanding achievement in a local AWS Student Builder Group', rightX - 18, rightY + 108, 232, 88, {
    font: 'times',
    style: 'normal',
    minSize: 12,
    maxSize: 18,
    color: [25, 20, 40],
    lineHeight: 1.22,
    align: 'center'
  });

  doc.setDrawColor(25, 20, 40);
  doc.setLineWidth(1.2);
  doc.line(650, 610, 860, 610);

  drawWrappedTextBlock(doc, 'Tracey Wang', 660, 635, 170, 36, {
    font: 'times',
    style: 'italic',
    minSize: 18,
    maxSize: 28,
    color: [25, 20, 40],
    lineHeight: 1.08,
    align: 'center'
  });

  drawWrappedTextBlock(doc, 'Community Program Manager', 650, 680, 190, 16, {
    font: 'times',
    style: 'normal',
    minSize: 10,
    maxSize: 12,
    color: [25, 20, 40],
    lineHeight: 1.0,
    align: 'center'
  });

  drawWrappedTextBlock(doc, 'AWS Student Builder Groups', 650, 700, 190, 16, {
    font: 'times',
    style: 'normal',
    minSize: 10,
    maxSize: 12,
    color: [25, 20, 40],
    lineHeight: 1.0,
    align: 'center'
  });

  return Buffer.from(doc.output('arraybuffer'));
}
