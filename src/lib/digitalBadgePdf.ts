import { DigitalBadge } from '@/types/digitalBadge';
import { generateBadgeQrDataUrl, getBadgeVerificationUrl, formatDisplayDate } from './digitalBadgeUtils';
import { splitBadgeTitle } from './badgeAssets';

// Using require for jsPDF to ensure seamless Node.js server and Next.js bundler compatibility
const { jsPDF } = require('jspdf');

const BRAND_COLORS = {
  navyDark: [7, 19, 31],        // #07131F
  navyMedium: [13, 34, 53],     // #0D2235
  navyCard: [11, 25, 44],       // #0B192C
  orangePrimary: [255, 153, 0], // #FF9900
  orangeLight: [255, 172, 51],  // #FFAC33
  orangeDark: [204, 122, 0],    // #CC7A00
  slateLight: [148, 163, 184],  // #94A3B8
  slateText: [203, 213, 225],   // #CBD5E1
  emeraldGreen: [16, 185, 129], // #10B981
  emeraldText: [52, 211, 153],  // #34D399
  white: [255, 255, 255],
  redRevoked: [220, 38, 38]     // #DC2626
};

/**
 * Generates an authoritative, professional single-page Digital Badge Credential Certificate PDF.
 * Landscape A4 orientation with crisp typography, vector shield badge, and high-contrast verification QR.
 */
export async function generateDigitalBadgePdfBuffer(badge: DigitalBadge): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 28;

  // 1. Generate high-res QR code
  let qrDataUrl = '';
  try {
    qrDataUrl = await generateBadgeQrDataUrl(badge.credentialId, 320);
  } catch (err) {
    console.error(`[Badge PDF] Failed to generate QR code for ${badge.credentialId}:`, err);
  }

  // 2. Draw Certificate Background & Guilloche Double Frame
  drawCertificateBackground(doc, pageWidth, pageHeight, margin);

  // 3. Draw Left Badge Showcase (Shield emblem, icon, category & verified status)
  drawBadgeShowcase(doc, margin, pageHeight, badge);

  // 4. Draw Right Content Area (Branding, Recipient, Title, Criteria, Skills, Metadata & QR)
  drawCredentialDetails(doc, pageWidth, pageHeight, margin, badge, qrDataUrl);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

export const generateDigitalBadgePdf = generateDigitalBadgePdfBuffer;

function drawCertificateBackground(doc: any, pageWidth: number, pageHeight: number, margin: number) {
  // Deep Navy Background
  doc.setFillColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer Gold Border
  doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setLineWidth(2.5);
  doc.roundedRect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 8, 8, 'S');

  // Inner Subtle Border
  doc.setDrawColor(50, 75, 105);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin + 5, margin + 5, pageWidth - (margin + 5) * 2, pageHeight - (margin + 5) * 2, 6, 6, 'S');
}

function drawBadgeShowcase(doc: any, margin: number, pageHeight: number, badge: DigitalBadge) {
  const centerX = margin + 130;
  const centerY = pageHeight / 2;
  const isRevoked = badge.status === 'REVOKED';

  // 1. Outer Deep Navy Circle Medallion Base
  doc.setFillColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setLineWidth(3);
  doc.circle(centerX, centerY, 114, 'FD');

  // 2. Concentric Inner Gold Accent Ring
  doc.setDrawColor(BRAND_COLORS.orangeLight[0], BRAND_COLORS.orangeLight[1], BRAND_COLORS.orangeLight[2]);
  doc.setLineWidth(1);
  doc.circle(centerX, centerY, 108, 'S');

  // 3. Inner White Canvas Disc
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1.5);
  doc.circle(centerX, centerY, 102, 'FD');

  // 4. Top Branding Section (AWS Logo + SBG CU-UP Centered Unit)
  const brandY = centerY - 74;
  
  // AWS Logo text
  doc.setTextColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('aws', centerX - 44, brandY + 8.5);

  // AWS Smile Arrow
  doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setLineWidth(1.1);
  doc.lines([[15, 0]], centerX - 45, brandY + 12, [1, 1], 'S');

  // Vertical Divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.line(centerX - 22, brandY + 1, centerX - 22, brandY + 15);

  // Issuer Text
  doc.setTextColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.text('AWS Student Builder Group', centerX - 15, brandY + 6.5);

  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.6);
  doc.text('Chandigarh University – Uttar Pradesh', centerX - 15, brandY + 12.5);

  // 5. Central Vector Cloud with Orbit & Satellite Sphere
  const cloudY = centerY - 38;

  // Cloud Body
  doc.setFillColor(255, 253, 248);
  doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setLineWidth(1.6);
  doc.roundedRect(centerX - 24, cloudY + 3, 48, 16, 8, 8, 'FD');
  doc.circle(centerX - 8, cloudY + 3, 10, 'FD');
  doc.circle(centerX + 8, cloudY + 5, 8, 'FD');

  // CloudXplore Typography
  doc.setTextColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CloudXplore', centerX, centerY - 14, { align: 'center' });

  // WEEKLY AWS LEARNING SERIES
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.text('WEEKLY AWS LEARNING SERIES', centerX, centerY - 8, { align: 'center' });

  // Subtle separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.line(centerX - 35, centerY - 3, centerX + 35, centerY - 3);

  // 6. Badge Title (Dedicated readable area)
  const titleY = centerY + 10;
  const { line1, line2 } = splitBadgeTitle(badge.badgeTitle);

  doc.setTextColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.setFont('helvetica', 'bold');

  if (line2) {
    doc.setFontSize(7.5);
    doc.text(line1.toUpperCase(), centerX, titleY, { align: 'center' });
    doc.setTextColor(BRAND_COLORS.orangeDark[0], BRAND_COLORS.orangeDark[1], BRAND_COLORS.orangeDark[2]);
    doc.setFontSize(6.8);
    doc.text(line2.toUpperCase(), centerX, titleY + 9, { align: 'center' });
  } else {
    doc.setFontSize(8);
    doc.text(line1.toUpperCase(), centerX, titleY + 4, { align: 'center' });
  }

  // 7. Ribbon: SESSION COMPLETION
  const ribbonY = centerY + 30;
  const ribbonW = 54;
  const ribbonH = 13;

  doc.setFillColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setLineWidth(1);
  doc.roundedRect(centerX - ribbonW, ribbonY, ribbonW * 2, ribbonH, 2.5, 2.5, 'FD');

  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(badge.category ? badge.category.toUpperCase() : 'SESSION COMPLETION', centerX, ribbonY + 9, { align: 'center' });

  // 8. Subtle Navy/Orange DIGITAL CREDENTIAL Pill
  const pillY = centerY + 50;
  doc.setFillColor(BRAND_COLORS.navyDark[0], BRAND_COLORS.navyDark[1], BRAND_COLORS.navyDark[2]);
  doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(centerX - 35, pillY, 70, 11, 5.5, 5.5, 'FD');

  doc.setFillColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.circle(centerX - 24, pillY + 5.5, 1.6, 'F');

  doc.setTextColor(BRAND_COLORS.orangeLight[0], BRAND_COLORS.orangeLight[1], BRAND_COLORS.orangeLight[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.text(isRevoked ? 'REVOKED CREDENTIAL' : 'DIGITAL CREDENTIAL', centerX + 3, pillY + 7.5, { align: 'center' });

  // 9. Clean Bottom Diamond Accent
  doc.setFillColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.circle(centerX, centerY + 72, 1.8, 'F');
}

function drawCredentialDetails(
  doc: any,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  badge: DigitalBadge,
  qrDataUrl: string
) {
  const contentLeft = margin + 250;
  const contentWidth = pageWidth - contentLeft - margin;
  let curY = margin + 26;

  // 1. Issuing Header
  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('AWS STUDENT BUILDER GROUP', contentLeft, curY);

  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CHANDIGARH UNIVERSITY – UTTAR PRADESH', contentLeft, curY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('OFFICIAL VERIFIED DIGITAL CREDENTIAL', contentLeft, curY + 23);

  curY += 44;

  // 2. Certification text
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('This official credential certifies that', contentLeft, curY);

  curY += 20;

  // 3. Recipient Full Name (Large & Prominent)
  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(badge.recipientName || 'Student Name', contentLeft, curY);

  curY += 6;

  // Gold accent divider line
  doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setLineWidth(1.5);
  doc.line(contentLeft, curY, contentLeft + Math.min(doc.getTextWidth(badge.recipientName || 'Student Name') + 40, contentWidth), curY);

  curY += 18;

  // 4. Achievement Declaration & Badge Title
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('has successfully fulfilled all requirements and earned the official community credential:', contentLeft, curY);

  curY += 18;

  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(badge.badgeTitle, contentLeft, curY);

  curY += 16;

  // 5. Earning Criteria Box
  doc.setFillColor(BRAND_COLORS.navyMedium[0], BRAND_COLORS.navyMedium[1], BRAND_COLORS.navyMedium[2]);
  doc.setDrawColor(45, 65, 90);
  doc.setLineWidth(0.6);
  doc.roundedRect(contentLeft, curY, contentWidth - 110, 68, 5, 5, 'FD');

  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('EARNING CRITERIA', contentLeft + 10, curY + 12);

  doc.setTextColor(BRAND_COLORS.slateText[0], BRAND_COLORS.slateText[1], BRAND_COLORS.slateText[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const criteriaLines = doc.splitTextToSize(
    badge.earningCriteria || badge.badgeDescription || 'Demonstrated technical competency.',
    contentWidth - 130
  );
  doc.text(criteriaLines.slice(0, 4), contentLeft + 10, curY + 24);

  // 6. QR Code (Right-aligned in Content Area)
  const qrSize = 80;
  const qrX = contentLeft + contentWidth - qrSize - 10;
  const qrY = curY;

  doc.setFillColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.roundedRect(qrX, qrY, qrSize, qrSize, 4, 4, 'F');

  if (qrDataUrl && qrDataUrl.startsWith('data:image/')) {
    try {
      doc.addImage(qrDataUrl, 'PNG', qrX + 4, qrY + 4, qrSize - 8, qrSize - 8);
    } catch (imgErr) {
      console.error('[Badge PDF] Error embedding QR image:', imgErr);
    }
  }

  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('SCAN TO VERIFY', qrX + qrSize / 2, qrY + qrSize + 12, { align: 'center' });

  curY += 76;

  // 7. Verified Skills Pills
  const skills = Array.isArray(badge.skills) && badge.skills.length > 0
    ? badge.skills
    : ['AWS Cloud', 'Cloud Architecture', 'Security'];

  let skillX = contentLeft;
  for (const skill of skills.slice(0, 5)) {
    const textWidth = doc.getTextWidth(skill);
    const pillWidth = textWidth + 12;
    if (skillX + pillWidth > qrX - 10) break;

    doc.setFillColor(BRAND_COLORS.navyCard[0], BRAND_COLORS.navyCard[1], BRAND_COLORS.navyCard[2]);
    doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(skillX, curY, pillWidth, 14, 7, 7, 'FD');

    doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text(skill, skillX + 6, curY + 10);

    skillX += pillWidth + 6;
  }

  curY += 28;

  // 8. Bottom 3-Column Metadata Bar
  const metaBoxY = pageHeight - margin - 58;
  doc.setFillColor(BRAND_COLORS.navyCard[0], BRAND_COLORS.navyCard[1], BRAND_COLORS.navyCard[2]);
  doc.setDrawColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(contentLeft, metaBoxY, contentWidth, 42, 4, 4, 'FD');

  // Col 1: Issued On
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('ISSUED ON:', contentLeft + 12, metaBoxY + 14);

  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(formatDisplayDate(badge.issueDate || badge.issuedAt), contentLeft + 12, metaBoxY + 28);

  // Col 2: Credential ID
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('CREDENTIAL ID:', contentLeft + 140, metaBoxY + 14);

  doc.setTextColor(BRAND_COLORS.orangePrimary[0], BRAND_COLORS.orangePrimary[1], BRAND_COLORS.orangePrimary[2]);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(badge.credentialId, contentLeft + 140, metaBoxY + 28);

  // Col 3: Issuer Authority
  doc.setTextColor(BRAND_COLORS.slateLight[0], BRAND_COLORS.slateLight[1], BRAND_COLORS.slateLight[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('ISSUING AUTHORITY:', contentLeft + 290, metaBoxY + 14);

  doc.setTextColor(BRAND_COLORS.white[0], BRAND_COLORS.white[1], BRAND_COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('AWS Student Builder Group – CU-UP', contentLeft + 290, metaBoxY + 28);
}
