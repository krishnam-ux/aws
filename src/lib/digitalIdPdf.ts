import { DigitalIdentity } from '@/types/digitalIdentity';
import { generateQrCodeDataUrl, getVerificationUrl, formatDisplayDate } from './digitalIdUtils';

// Using require for jsPDF to ensure seamless Node.js server and Next.js bundler compatibility
const { jsPDF } = require('jspdf');

const BRAND_COLORS = {
  navyDark: [8, 26, 42],       // #081A2A
  navyDeep: [15, 41, 66],      // #0F2942
  navyLight: [241, 245, 249],  // #F1F5F9
  orangePrimary: [255, 153, 0],// #FF9900
  orangeDark: [236, 114, 17],  // #EC7211
  slateDark: [30, 41, 59],     // #1E293B
  slateMedium: [71, 85, 105],  // #475569
  slateLight: [148, 163, 184], // #94A3B8
  borderSlate: [226, 232, 240],// #E2E8F0
  emeraldGreen: [16, 185, 129],// #10B981
  white: [255, 255, 255],
  amberBadge: [245, 158, 11]
};

/**
 * Generates a complete professional 2-page or dual-card PDF buffer for a Digital Identity card.
 */
export async function generateDigitalIdPdfBuffer(identity: DigitalIdentity): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;

  // Generate QR Code data URL
  let qrDataUrl = '';
  try {
    qrDataUrl = await generateQrCodeDataUrl(identity.publicId);
  } catch (err) {
    console.error('Failed to generate QR code for PDF:', err);
  }

  // Draw Page 1: Official Digital Identity Certificate & Card Sheet
  drawDocumentHeader(doc, pageWidth, margin);

  // Card dimensions (standard ID badge proportion: ~320pt wide x 480pt high)
  const cardWidth = 240;
  const cardHeight = 380;
  const cardY = 130;
  const card1X = margin + 15;
  const card2X = pageWidth - margin - cardWidth - 15;

  // 1. Draw Front Card
  drawCardFront(doc, card1X, cardY, cardWidth, cardHeight, identity);

  // 2. Draw Back Card
  drawCardBack(doc, card2X, cardY, cardWidth, cardHeight, identity, qrDataUrl);

  // 3. Draw Document Details & Verification Box below cards
  drawDocumentFooter(doc, pageWidth, pageHeight, margin, identity);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

export const generateDigitalIdPdf = generateDigitalIdPdfBuffer;

function drawDocumentHeader(doc: any, pageWidth: number, margin: number) {
  // Top Navy Banner
  doc.setFillColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.rect(0, 0, pageWidth, 75, 'F');

  // Orange Accent Line
  doc.setFillColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.rect(0, 75, pageWidth, 4, 'F');

  // Title
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AWS STUDENT BUILDER GROUP', margin, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.text('CHANDIGARH UNIVERSITY – UTTAR PRADESH', margin, 46);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('OFFICIAL DIGITAL IDENTITY CREDENTIAL', margin, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.text('COMMUNITY VERIFICATION SYSTEM', pageWidth - margin, 46, { align: 'right' });
}

function drawCardFront(
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  identity: DigitalIdentity
) {
  // Card Shadow / Outline
  doc.setFillColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.roundedRect(x, y, width, height, 8, 8, 'F');

  // Decorative Top Arc / Accent
  doc.setFillColor(BRAND_COLORS.navyDeep[0], BRAND_COLORS.navyDeep[1], BRAND_COLORS.navyDeep[2]);
  doc.rect(x, y, width, 60, 'F');
  doc.setFillColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.rect(x, y + 60, width, 3, 'F');

  // Card Header Label
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('AWS STUDENT BUILDER GROUP', x + width / 2, y + 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.text('CHANDIGARH UNIVERSITY – UP', x + width / 2, y + 36, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('DIGITAL IDENTITY CARD', x + width / 2, y + 48, { align: 'center' });

  // Photo Area
  const photoSize = 80;
  const photoX = x + (width - photoSize) / 2;
  const photoY = y + 75;

  let photoEmbedded = false;
  if (identity.photoUrl && identity.photoUrl.startsWith('data:image/')) {
    try {
      const format = identity.photoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(identity.photoUrl, format, photoX, photoY, photoSize, photoSize);
      photoEmbedded = true;
    } catch (err) {
      console.warn('Failed to render photo in PDF card front, using initial fallback:', err);
    }
  }

  if (!photoEmbedded) {
    // Fallback Initial Avatar
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
    doc.setLineWidth(1.5);
    doc.roundedRect(photoX, photoY, photoSize, photoSize, 6, 6, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
    const initial = (identity.fullName || 'M').charAt(0).toUpperCase();
    doc.text(initial, photoX + photoSize / 2, photoY + photoSize / 2 + 10, { align: 'center' });
  } else {
    // Outer border for embedded photo
    doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
    doc.setLineWidth(1.5);
    doc.roundedRect(photoX, photoY, photoSize, photoSize, 4, 4, 'S');
  }

  // Name
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const nameLines = doc.splitTextToSize(identity.fullName || 'Member', width - 24);
  doc.text(nameLines.slice(0, 2), x + width / 2, y + 175, { align: 'center' });

  // Role / Position
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const roleLines = doc.splitTextToSize(identity.role || 'Member', width - 24);
  doc.text(roleLines.slice(0, 2), x + width / 2, y + 198, { align: 'center' });

  // Member Type Badge
  const badgeWidth = 110;
  const badgeHeight = 16;
  const badgeX = x + (width - badgeWidth) / 2;
  const badgeY = y + 218;

  doc.setFillColor(BRAND_COLORS.navyDeep[0], BRAND_COLORS.navyDeep[1], BRAND_COLORS.navyDeep[2]);
  doc.setDrawColor(BRAND_COLORS.slateMedium[0], BRAND_COLORS.slateMedium[1], BRAND_COLORS.slateMedium[2]);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3, 3, 'FD');

  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(String(identity.memberType || 'Core Team').toUpperCase(), x + width / 2, badgeY + 11, { align: 'center' });

  // Domain (if present)
  if (identity.domain) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
    doc.text(`Domain: ${identity.domain}`, x + width / 2, y + 252, { align: 'center', maxWidth: width - 20 });
  }

  // Digital ID Box
  const idBoxY = y + 275;
  doc.setFillColor(15, 23, 42);
  doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setLineWidth(1);
  doc.roundedRect(x + 20, idBoxY, width - 40, 44, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('PERMANENT DIGITAL ID', x + width / 2, idBoxY + 14, { align: 'center' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.text(identity.publicId || 'ID-000', x + width / 2, idBoxY + 32, { align: 'center' });

  // Status Indicator
  const isSuspended = identity.status === 'SUSPENDED';
  const isRevoked = identity.status === 'REVOKED';
  const statusColor = isRevoked ? [239, 68, 68] : isSuspended ? [245, 158, 11] : [16, 185, 129];
  const statusText = identity.status || 'ACTIVE';

  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.circle(x + width / 2 - 25, y + 342, 3.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(statusText, x + width / 2 - 16, y + 345);

  // Label Front
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(BRAND_COLORS.slateMedium[0], BRAND_COLORS.slateMedium[1], BRAND_COLORS.slateMedium[2]);
  doc.text('FRONT CARD', x + width / 2, y + height + 16, { align: 'center' });
}

function drawCardBack(
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  identity: DigitalIdentity,
  qrDataUrl: string
) {
  // Card Container
  doc.setFillColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.roundedRect(x, y, width, height, 8, 8, 'F');

  // Top Banner
  doc.setFillColor(BRAND_COLORS.navyDeep[0], BRAND_COLORS.navyDeep[1], BRAND_COLORS.navyDeep[2]);
  doc.rect(x, y, width, 45, 'F');
  doc.setFillColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.rect(x, y + 45, width, 3, 'F');

  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DIGITAL ID VERIFICATION', x + width / 2, y + 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('OFFICIAL REGISTRY SCANNER', x + width / 2, y + 34, { align: 'center' });

  // QR Code Area
  const qrBoxSize = 104;
  const qrX = x + (width - qrBoxSize) / 2;
  const qrY = y + 58;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrX, qrY, qrBoxSize, qrBoxSize, 4, 4, 'F');

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', qrX + 4, qrY + 4, qrBoxSize - 8, qrBoxSize - 8);
    } catch (e) {
      console.warn('Failed to embed QR code into PDF:', e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.text('SCAN TO VERIFY IDENTITY', x + width / 2, y + 176, { align: 'center' });

  // Details List
  const detailsY = y + 192;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('Digital ID:', x + 16, detailsY);
  doc.setFont('courier', 'bold');
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.text(identity.publicId, x + 70, detailsY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('Status:', x + 16, detailsY + 15);
  const isRevoked = identity.status === 'REVOKED';
  const isSuspended = identity.status === 'SUSPENDED';
  const statusColor = isRevoked ? [239, 68, 68] : isSuspended ? [245, 158, 11] : [16, 185, 129];
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(identity.status || 'ACTIVE', x + 70, detailsY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('Issued Date:', x + 16, detailsY + 30);
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.text(formatDisplayDate(identity.issuedAt || identity.createdAt), x + 70, detailsY + 30);

  // Verification URL
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('Verify URL:', x + 16, detailsY + 45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  const verUrl = getVerificationUrl(identity.publicId);
  doc.text(verUrl, x + 70, detailsY + 45, { maxWidth: width - 80 });

  // Security Disclaimer Box
  const discY = y + 265;
  doc.setFillColor(BRAND_COLORS.navyDeep[0], BRAND_COLORS.navyDeep[1], BRAND_COLORS.navyDeep[2]);
  doc.roundedRect(x + 12, discY, width - 24, 76, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.text('SECURITY & VALIDITY NOTICE', x + width / 2, discY + 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  const disclaimerText = "This Digital ID is valid only while the associated identity remains active in the official verification registry. Issued by AWS Student Builder Group at Chandigarh University – Uttar Pradesh as a student community identity.";
  const discLines = doc.splitTextToSize(disclaimerText, width - 40);
  doc.text(discLines, x + 20, discY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.text('www.awssbgcuup.tech', x + width / 2, discY + 66, { align: 'center' });

  // Label Back
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(BRAND_COLORS.slateMedium[0], BRAND_COLORS.slateMedium[1], BRAND_COLORS.slateMedium[2]);
  doc.text('BACK CARD (VERIFICATION)', x + width / 2, y + height + 16, { align: 'center' });
}

function drawDocumentFooter(
  doc: any,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  identity: DigitalIdentity
) {
  const footerY = 560;
  const contentWidth = pageWidth - margin * 2;

  // Information Container
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(BRAND_COLORS.borderSlate[0], BRAND_COLORS.borderSlate[1], BRAND_COLORS.borderSlate[2]);
  doc.roundedRect(margin, footerY, contentWidth, 210, 6, 6, 'FD');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.text('Official Digital ID Certificate & Registry Information', margin + 16, footerY + 24);

  // Table grid
  const col1X = margin + 16;
  const col2X = margin + contentWidth / 2 + 10;
  let rowY = footerY + 48;

  const drawRow = (label: string, value: string, targetX: number, currentY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(BRAND_COLORS.slateMedium[0], BRAND_COLORS.slateMedium[1], BRAND_COLORS.slateMedium[2]);
    doc.text(label, targetX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(BRAND_COLORS.slateDark[0], BRAND_COLORS.slateDark[1], BRAND_COLORS.slateDark[2]);
    doc.text(value || '—', targetX + 110, currentY, { maxWidth: contentWidth / 2 - 120 });
  };

  drawRow('Full Name:', identity.fullName, col1X, rowY);
  drawRow('Digital ID:', identity.publicId, col2X, rowY);
  rowY += 18;

  drawRow('Role / Position:', identity.role, col1X, rowY);
  drawRow('Member Type:', identity.memberType, col2X, rowY);
  rowY += 18;

  drawRow('Domain:', identity.domain || 'Cloud Computing & AI', col1X, rowY);
  drawRow('Status:', identity.status, col2X, rowY);
  rowY += 18;

  drawRow('University:', identity.university || 'Chandigarh University – UP', col1X, rowY);
  drawRow('Issue Date:', formatDisplayDate(identity.issuedAt || identity.createdAt), col2X, rowY);
  rowY += 18;

  if (identity.email) {
    drawRow('Registered Email:', identity.email, col1X, rowY);
  }
  if (identity.course || identity.branch) {
    drawRow('Program/Branch:', `${identity.course || ''} ${identity.branch || ''}`.trim(), col2X, rowY);
  }
  rowY += 24;

  // Horizontal divider
  doc.setDrawColor(BRAND_COLORS.borderSlate[0], BRAND_COLORS.borderSlate[1], BRAND_COLORS.borderSlate[2]);
  doc.line(col1X, rowY, margin + contentWidth - 16, rowY);
  rowY += 16;

  // Notice text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(BRAND_COLORS.slateMedium[0], BRAND_COLORS.slateMedium[1], BRAND_COLORS.slateMedium[2]);
  const notice = "This document confirms that the above individual is registered in the official Digital ID registry of the AWS Student Builder Group at Chandigarh University – Uttar Pradesh. To verify in real-time, visit the official verification URL or scan the QR code above.";
  const lines = doc.splitTextToSize(notice, contentWidth - 32);
  doc.text(lines, col1X, rowY);

  // Bottom Disclaimer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('AWS Student Builder Group at Chandigarh University – Uttar Pradesh is a student-led technology community. This is not an official Amazon Web Services corporate employee ID.', pageWidth / 2, pageHeight - 20, { align: 'center' });
}
