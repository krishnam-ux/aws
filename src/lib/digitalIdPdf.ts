import { DigitalIdentity } from '@/types/digitalIdentity';
import { generateQrCodeDataUrl, getVerificationUrl, formatDisplayDate } from './digitalIdUtils';

// Using require for jsPDF to ensure seamless Node.js server and Next.js bundler compatibility
const { jsPDF } = require('jspdf');

const BRAND_COLORS = {
  navyDark: [8, 23, 38],        // #081726
  navyDeep: [15, 34, 56],       // #0F2238
  navyBox: [4, 14, 24],         // #040E18
  navyLight: [241, 245, 249],   // #F1F5F9
  orangePrimary: [255, 153, 0], // #FF9900
  orangeDark: [236, 114, 17],   // #EC7211
  slateDark: [30, 41, 59],      // #1E293B
  slateMedium: [71, 85, 105],   // #475569
  slateLight: [148, 163, 184],  // #94A3B8
  borderSlate: [226, 232, 240], // #E2E8F0
  emeraldGreen: [16, 185, 129], // #10B981
  white: [255, 255, 255],
  amberBadge: [245, 158, 11]
};

/**
 * Generates a complete professional 2-card PDF sheet for a Digital Identity card.
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

  // Generate QR Code data URL encoding canonical verification link
  let qrDataUrl = '';
  try {
    const verifyUrl = getVerificationUrl(identity.publicId);
    qrDataUrl = await generateQrCodeDataUrl(verifyUrl);
  } catch (err) {
    console.error('Failed to generate QR code for PDF:', err);
  }

  // Draw Page 1: Official Digital Identity Certificate & Card Sheet
  drawDocumentHeader(doc, pageWidth, margin);

  // Card dimensions (standard ID badge proportion: ~240pt wide x 390pt high)
  const cardWidth = 240;
  const cardHeight = 390;
  const cardY = 125;
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
  doc.setFontSize(13);
  doc.text('AWS STUDENT BUILDER GROUP', margin, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.text('CHANDIGARH UNIVERSITY – UTTAR PRADESH', margin, 46);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('OFFICIAL DIGITAL MEMBER IDENTITY CARD', margin, 60);

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
  // Card Container Background (Dark Navy)
  doc.setFillColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.roundedRect(x, y, width, height, 8, 8, 'F');

  // Top Header Banner
  doc.setFillColor(BRAND_COLORS.navyDeep[0], BRAND_COLORS.navyDeep[1], BRAND_COLORS.navyDeep[2]);
  doc.rect(x, y, width, 55, 'F');
  doc.setFillColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.rect(x, y + 55, width, 2.5, 'F');

  // Header Title
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('AWS STUDENT BUILDER GROUP', x + width / 2, y + 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.text('Chandigarh University – Uttar Pradesh', x + width / 2, y + 36, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('STUDENT COMMUNITY MEMBERSHIP', x + width / 2, y + 47, { align: 'center' });

  // Photo Area
  const photoSize = 75;
  const photoX = x + (width - photoSize) / 2;
  const photoY = y + 70;

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
    doc.setFillColor(BRAND_COLORS.navyDeep[0], BRAND_COLORS.navyDeep[1], BRAND_COLORS.navyDeep[2]);
    doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
    doc.setLineWidth(1.5);
    doc.roundedRect(photoX, photoY, photoSize, photoSize, 6, 6, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
    const initial = (identity.fullName || 'M').charAt(0).toUpperCase();
    doc.text(initial, photoX + photoSize / 2, photoY + photoSize / 2 + 9, { align: 'center' });
  } else {
    // Outer border for embedded photo
    doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
    doc.setLineWidth(1.5);
    doc.roundedRect(photoX, photoY, photoSize, photoSize, 4, 4, 'S');
  }

  // Member Full Name (Large, Readable)
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  const nameLines = doc.splitTextToSize(identity.fullName || 'Member', width - 24);
  doc.text(nameLines.slice(0, 2), x + width / 2, y + 165, { align: 'center' });

  // Role / Designation
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const roleLines = doc.splitTextToSize(identity.role || 'Member', width - 24);
  doc.text(roleLines.slice(0, 2), x + width / 2, y + 185, { align: 'center' });

  // Team / Domain
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  const domainText = identity.domain ? `Domain: ${identity.domain}` : (identity.memberType || 'Core Team');
  doc.text(domainText, x + width / 2, y + 204, { align: 'center', maxWidth: width - 20 });

  // Dedicated Highlighted Section for Member ID
  const idBoxY = y + 224;
  doc.setFillColor(BRAND_COLORS.navyBox[0], BRAND_COLORS.navyBox[1], BRAND_COLORS.navyBox[2]);
  doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setLineWidth(1);
  doc.roundedRect(x + 16, idBoxY, width - 32, 52, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('MEMBER ID', x + 26, idBoxY + 16);

  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.text(identity.publicId || 'ID-000', x + 26, idBoxY + 36);

  // Status Indicator on the right of ID Box
  const isActive = identity.status === 'ACTIVE';
  const isSuspended = identity.status === 'SUSPENDED';
  const isRevoked = identity.status === 'REVOKED';
  const statusColor = isRevoked ? [239, 68, 68] : isSuspended ? [245, 158, 11] : [16, 185, 129];
  const statusText = isActive ? 'ACTIVE MEMBER' : (identity.status || 'ACTIVE');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('STATUS', x + width - 26, idBoxY + 16, { align: 'right' });

  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.circle(x + width - 82, idBoxY + 32, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(statusText, x + width - 26, idBoxY + 35, { align: 'right' });

  // Minimal Footer on Front Card
  const footerY = y + height - 22;
  doc.setDrawColor(BRAND_COLORS.slateMedium[0], BRAND_COLORS.slateMedium[1], BRAND_COLORS.slateMedium[2]);
  doc.setLineWidth(0.5);
  doc.line(x + 16, footerY, x + width - 16, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('Student Community Membership ID', x + width / 2, footerY + 14, { align: 'center' });

  // Outer Label
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
  doc.rect(x, y, width, 44, 'F');
  doc.setFillColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.rect(x, y + 44, width, 2.5, 'F');

  // Title: DIGITAL MEMBER VERIFICATION
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DIGITAL MEMBER VERIFICATION', x + width / 2, y + 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.text('Official Verification Registry • Scannable QR', x + width / 2, y + 33, { align: 'center' });

  // Large QR Code Area
  const qrBoxSize = 96;
  const qrX = x + (width - qrBoxSize) / 2;
  const qrY = y + 54;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setLineWidth(1);
  doc.roundedRect(qrX, qrY, qrBoxSize, qrBoxSize, 4, 4, 'FD');

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', qrX + 4, qrY + 4, qrBoxSize - 8, qrBoxSize - 8);
    } catch (e) {
      console.warn('Failed to embed QR code into PDF:', e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('SCAN TO VERIFY CREDENTIALS', x + width / 2, y + 162, { align: 'center' });

  // Member Record Details List
  const detailsY = y + 176;
  doc.setFillColor(BRAND_COLORS.navyBox[0], BRAND_COLORS.navyBox[1], BRAND_COLORS.navyBox[2]);
  doc.roundedRect(x + 12, detailsY, width - 24, 112, 4, 4, 'F');

  const drawBackRow = (label: string, value: string, rowYPos: number, isMono = false, isOrange = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
    doc.text(label, x + 20, rowYPos);

    if (isMono) {
      doc.setFont('courier', 'bold');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    doc.setFontSize(6);

    if (isOrange) {
      doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
    } else {
      doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
    }

    doc.text(value, x + 82, rowYPos, { maxWidth: width - 106 });
  };

  let rY = detailsY + 14;
  drawBackRow('Member ID:', identity.publicId, rY, true);
  rY += 14;
  drawBackRow('Member Name:', identity.fullName, rY);
  rY += 14;
  drawBackRow('Role:', identity.role, rY, false, true);
  rY += 14;
  drawBackRow('Team / Domain:', identity.domain || 'Cloud & Emerging Tech', rY);
  rY += 14;

  const isActive = identity.status === 'ACTIVE';
  drawBackRow('Status:', identity.status || 'ACTIVE', rY);
  rY += 14;
  drawBackRow('Issue Date:', formatDisplayDate(identity.issuedAt || identity.createdAt), rY);
  rY += 14;
  const verUrl = getVerificationUrl(identity.publicId).replace(/^https?:\/\//, '');
  drawBackRow('Verify URL:', verUrl, rY, true, true);

  // Short Mandatory Statement
  const discY = y + 296;
  doc.setFillColor(BRAND_COLORS.navyDeep[0], BRAND_COLORS.navyDeep[1], BRAND_COLORS.navyDeep[2]);
  doc.roundedRect(x + 12, discY, width - 24, 76, 4, 4, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  const disclaimerText = "“This card identifies the holder as a registered member of the AWS Student Builder Group at Chandigarh University – Uttar Pradesh. Membership can be verified through the official verification URL or QR code.”";
  const discLines = doc.splitTextToSize(disclaimerText, width - 40);
  doc.text(discLines, x + 20, discY + 18, { align: 'left', maxWidth: width - 40 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.text('AWS STUDENT BUILDER GROUP • CU-UP', x + width / 2, discY + 64, { align: 'center' });

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
  const footerY = 570;
  const contentWidth = pageWidth - margin * 2;

  // Information Container
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(BRAND_COLORS.borderSlate[0], BRAND_COLORS.borderSlate[1], BRAND_COLORS.borderSlate[2]);
  doc.roundedRect(margin, footerY, contentWidth, 200, 6, 6, 'FD');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.text('Official Member Record & Identity Certificate', margin + 16, footerY + 24);

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
  drawRow('Member ID:', identity.publicId, col2X, rowY);
  rowY += 18;

  drawRow('Role / Position:', identity.role, col1X, rowY);
  drawRow('Member Type:', identity.memberType, col2X, rowY);
  rowY += 18;

  drawRow('Team / Domain:', identity.domain || 'Cloud & Emerging Tech', col1X, rowY);
  drawRow('Status:', identity.status, col2X, rowY);
  rowY += 18;

  drawRow('University:', identity.university || 'Chandigarh University – Uttar Pradesh', col1X, rowY);
  drawRow('Issue Date:', formatDisplayDate(identity.issuedAt || identity.createdAt), col2X, rowY);
  rowY += 18;

  if (identity.email) {
    drawRow('Registered Email:', identity.email, col1X, rowY);
  }
  if (identity.course || identity.branch) {
    drawRow('Program/Branch:', `${identity.course || ''} ${identity.branch || ''}`.trim(), col2X, rowY);
  }
  rowY += 22;

  // Horizontal divider
  doc.setDrawColor(BRAND_COLORS.borderSlate[0], BRAND_COLORS.borderSlate[1], BRAND_COLORS.borderSlate[2]);
  doc.line(col1X, rowY, margin + contentWidth - 16, rowY);
  rowY += 16;

  // Notice text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(BRAND_COLORS.slateMedium[0], BRAND_COLORS.slateMedium[1], BRAND_COLORS.slateMedium[2]);
  const notice = "This document confirms that the above individual is registered in the official Member Registry of the AWS Student Builder Group at Chandigarh University – Uttar Pradesh. To verify in real-time, visit the official verification URL or scan the QR code above.";
  const lines = doc.splitTextToSize(notice, contentWidth - 32);
  doc.text(lines, col1X, rowY);

  // Bottom Disclaimer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.text('AWS Student Builder Group at Chandigarh University – Uttar Pradesh is a student-led technology community. This is not an official Amazon Web Services corporate employee ID.', pageWidth / 2, pageHeight - 20, { align: 'center' });
}
