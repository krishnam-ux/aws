import { FoundingMember, FoundingMemberFormConfig, FormQuestion } from '@/types/foundingMember';

// Using require for jsPDF to ensure seamless Node.js server and Next.js bundler compatibility
const { jsPDF } = require('jspdf');

interface PdfOptions {
  formConfig?: FoundingMemberFormConfig | null;
}

const COLORS = {
  navyDark: [15, 23, 42],       // #0F172A
  navyDeep: [27, 42, 74],       // #1B2A4A
  navyCard: [248, 250, 252],    // #F8FAFC
  orangePrimary: [255, 153, 0], // #FF9900
  orangeDark: [224, 136, 0],    // #E08800
  slateText: [51, 65, 85],      // #334155
  slateLight: [100, 116, 139],  // #64748B
  slateMuted: [148, 163, 184],  // #94A3B8
  borderSlate: [226, 232, 240], // #E2E8F0
  emeraldGreen: [16, 185, 129], // #10B981
  white: [255, 255, 255]
};

/**
 * Draws a single Founding Member profile page onto the provided jsPDF document.
 */
export function drawFoundingMemberPage(
  doc: any,
  member: FoundingMember,
  formConfig?: FoundingMemberFormConfig | null,
  isFirstPage = true
) {
  if (!isFirstPage) {
    doc.addPage();
  }

  const pageWidth = 595.28; // A4 pt
  const pageHeight = 841.89; // A4 pt
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // 1. Top Header Banner
  doc.setFillColor(COLORS.navyDark[0], COLORS.navyDark[1], COLORS.navyDark[2]);
  doc.rect(0, 0, pageWidth, 90, 'F');

  // Orange Accent Bar
  doc.setFillColor(COLORS.orangePrimary[0], COLORS.orangePrimary[1], COLORS.orangePrimary[2]);
  doc.rect(0, 90, pageWidth, 4, 'F');

  // Header Titles
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AWS STUDENT BUILDER GROUP', margin, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.orangePrimary[0], COLORS.orangePrimary[1], COLORS.orangePrimary[2]);
  doc.text('CHANDIGARH UNIVERSITY – UTTAR PRADESH', margin, 48);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.slateMuted[0], COLORS.slateMuted[1], COLORS.slateMuted[2]);
  doc.text('OFFICIAL FOUNDING MEMBER PROFILE & CREDENTIALS', margin, 62);

  // 2. Member Identity & Badge Container
  const headerCardY = 106;
  const headerCardHeight = 88;

  doc.setFillColor(COLORS.navyCard[0], COLORS.navyCard[1], COLORS.navyCard[2]);
  doc.setDrawColor(COLORS.borderSlate[0], COLORS.borderSlate[1], COLORS.borderSlate[2]);
  doc.roundedRect(margin, headerCardY, contentWidth, headerCardHeight, 4, 4, 'FD');

  // Profile Photo or Fallback Box
  const photoSize = 64;
  const photoX = margin + 12;
  const photoY = headerCardY + 12;

  let photoRendered = false;
  if (member.photoUrl && member.photoUrl.startsWith('data:image/')) {
    try {
      const format = member.photoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(member.photoUrl, format, photoX, photoY, photoSize, photoSize);
      photoRendered = true;
    } catch (e) {
      console.warn('Failed to embed photo into PDF, using fallback:', e);
    }
  }

  if (!photoRendered) {
    // Fallback Initial Avatar
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(COLORS.orangePrimary[0], COLORS.orangePrimary[1], COLORS.orangePrimary[2]);
    doc.roundedRect(photoX, photoY, photoSize, photoSize, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(180, 83, 9); // Amber-800
    const initial = (member.fullName || member.name || 'F').charAt(0).toUpperCase();
    doc.text(initial, photoX + photoSize / 2, photoY + photoSize / 2 + 8, { align: 'center' });
  }

  // Name & Primary Meta
  const infoX = photoX + photoSize + 16;
  const displayName = member.fullName || member.name || 'Founding Member';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(COLORS.navyDark[0], COLORS.navyDark[1], COLORS.navyDark[2]);
  doc.text(displayName, infoX, headerCardY + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLORS.orangeDark[0], COLORS.orangeDark[1], COLORS.orangeDark[2]);
  doc.text(`${member.domain || 'Cloud & Infrastructure'} • ${member.role || 'Founding Member'}`, infoX, headerCardY + 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLORS.slateLight[0], COLORS.slateLight[1], COLORS.slateLight[2]);
  const academicSub = [member.courseBranch, member.university || 'Chandigarh University'].filter(Boolean).join(' | ');
  doc.text(academicSub, infoX, headerCardY + 58);

  // Permanent Member ID Badge (Right side of Card)
  const badgeWidth = 140;
  const badgeHeight = 44;
  const badgeX = margin + contentWidth - badgeWidth - 12;
  const badgeY = headerCardY + 12;

  doc.setFillColor(COLORS.navyDark[0], COLORS.navyDark[1], COLORS.navyDark[2]);
  doc.setDrawColor(COLORS.orangePrimary[0], COLORS.orangePrimary[1], COLORS.orangePrimary[2]);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.orangePrimary[0], COLORS.orangePrimary[1], COLORS.orangePrimary[2]);
  doc.text('FOUNDING MEMBER ID', badgeX + badgeWidth / 2, badgeY + 15, { align: 'center' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  const pubId = member.memberId || 'FMB-CUUP-000';
  doc.text(pubId, badgeX + badgeWidth / 2, badgeY + 32, { align: 'center' });

  // 3. Grid Sections
  let curY = headerCardY + headerCardHeight + 14;

  const renderSectionHeader = (title: string, icon = '•') => {
    doc.setFillColor(COLORS.navyDark[0], COLORS.navyDark[1], COLORS.navyDark[2]);
    doc.rect(margin, curY, 3, 14, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(COLORS.navyDark[0], COLORS.navyDark[1], COLORS.navyDark[2]);
    doc.text(`${title.toUpperCase()}`, margin + 8, curY + 11);

    curY += 18;
  };

  const renderFieldBox = (label: string, value: string, x: number, y: number, width: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.slateLight[0], COLORS.slateLight[1], COLORS.slateLight[2]);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(COLORS.slateText[0], COLORS.slateText[1], COLORS.slateText[2]);
    const cleanVal = String(value || '—').trim() || '—';
    const splitLines = doc.splitTextToSize(cleanVal, width);
    doc.text(splitLines, x, y + 11);
    return splitLines.length * 10;
  };

  // --- SECTION A: Contact & Academic Credentials ---
  renderSectionHeader('Academic Credentials & Contact Details');

  const colWidth = (contentWidth - 12) / 2;
  const startGridY = curY;

  // Box A1
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(COLORS.borderSlate[0], COLORS.borderSlate[1], COLORS.borderSlate[2]);
  doc.roundedRect(margin, startGridY, colWidth, 74, 3, 3, 'FD');

  renderFieldBox('Official Email', member.email || '—', margin + 8, startGridY + 12, colWidth - 16);
  renderFieldBox('Phone Number', member.phone || '—', margin + 8, startGridY + 36, colWidth - 16);
  renderFieldBox('Student ID / UID', member.studentId || '—', margin + 8, startGridY + 60, colWidth - 16);

  // Box A2
  const col2X = margin + colWidth + 12;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(COLORS.borderSlate[0], COLORS.borderSlate[1], COLORS.borderSlate[2]);
  doc.roundedRect(col2X, startGridY, colWidth, 74, 3, 3, 'FD');

  renderFieldBox('University / Institute', member.university || 'Chandigarh University', col2X + 8, startGridY + 12, colWidth - 16);
  renderFieldBox('Course & Branch', member.courseBranch || '—', col2X + 8, startGridY + 36, colWidth - 16);
  renderFieldBox('Year & Semester', member.yearSemester || '—', col2X + 8, startGridY + 60, colWidth - 16);

  curY = startGridY + 82;

  // --- SECTION B: Technical Skills & Experience ---
  renderSectionHeader('Technical Skills & Community Contributions');

  // Skills
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(COLORS.borderSlate[0], COLORS.borderSlate[1], COLORS.borderSlate[2]);

  const skillsText = member.skills || 'No specific skills listed.';
  const skillsLines = doc.splitTextToSize(skillsText, contentWidth - 16);
  const skillsBoxHeight = Math.max(34, skillsLines.length * 10 + 18);

  doc.roundedRect(margin, curY, contentWidth, skillsBoxHeight, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.slateLight[0], COLORS.slateLight[1], COLORS.slateLight[2]);
  doc.text('CORE TECHNICAL SKILLS & CERTIFICATIONS', margin + 8, curY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLORS.slateText[0], COLORS.slateText[1], COLORS.slateText[2]);
  doc.text(skillsLines, margin + 8, curY + 22);

  curY += skillsBoxHeight + 8;

  // Experience
  const expText = member.experience || 'Foundational contributor to AWS Student Builder Group activities.';
  const expLines = doc.splitTextToSize(expText, contentWidth - 16);
  const expBoxHeight = Math.max(36, expLines.length * 10 + 18);

  doc.roundedRect(margin, curY, contentWidth, expBoxHeight, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.slateLight[0], COLORS.slateLight[1], COLORS.slateLight[2]);
  doc.text('EXPERIENCE & COMMUNITY CONTRIBUTIONS', margin + 8, curY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLORS.slateText[0], COLORS.slateText[1], COLORS.slateText[2]);
  doc.text(expLines, margin + 8, curY + 22);

  curY += expBoxHeight + 10;

  // --- SECTION C: Dynamic Custom Questions & Answers ---
  const customQuestions = (formConfig?.questions || []).filter(
    (q) =>
      q.enabled &&
      ![
        'fullName',
        'email',
        'phone',
        'university',
        'courseBranch',
        'yearSemester',
        'studentId',
        'photoUrl',
        'domain',
        'skills',
        'experience',
        'linkedin',
        'github',
        'portfolio',
        'bio'
      ].includes(q.id)
  );

  if (customQuestions.length > 0) {
    renderSectionHeader('Specialized & Custom Questions');

    for (const q of customQuestions) {
      let ans = member.customAnswers?.[q.id];
      if (Array.isArray(ans)) ans = ans.join(', ');
      const ansStr = ans ? String(ans).trim() : 'Not answered';

      const ansLines = doc.splitTextToSize(ansStr, contentWidth - 16);
      const qBoxHeight = Math.max(30, ansLines.length * 9.5 + 18);

      // Page break check
      if (curY + qBoxHeight > pageHeight - 50) {
        doc.addPage();
        curY = 40;
      }

      doc.setFillColor(COLORS.navyCard[0], COLORS.navyCard[1], COLORS.navyCard[2]);
      doc.setDrawColor(COLORS.borderSlate[0], COLORS.borderSlate[1], COLORS.borderSlate[2]);
      doc.roundedRect(margin, curY, contentWidth, qBoxHeight, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.navyDark[0], COLORS.navyDark[1], COLORS.navyDark[2]);
      doc.text(q.label.toUpperCase(), margin + 8, curY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(COLORS.slateText[0], COLORS.slateText[1], COLORS.slateText[2]);
      doc.text(ansLines, margin + 8, curY + 20);

      curY += qBoxHeight + 6;
    }
  }

  // --- SECTION D: Online Profiles & Bio ---
  if (curY + 70 > pageHeight - 50) {
    doc.addPage();
    curY = 40;
  }

  renderSectionHeader('Online Profiles & Verification');

  const linkColWidth = (contentWidth - 16) / 3;
  const linkBoxY = curY;

  const profiles = [
    { label: 'LinkedIn', val: member.linkedin },
    { label: 'GitHub', val: member.github },
    { label: 'Portfolio', val: member.portfolio }
  ];

  profiles.forEach((p, idx) => {
    const pX = margin + idx * (linkColWidth + 8);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(COLORS.borderSlate[0], COLORS.borderSlate[1], COLORS.borderSlate[2]);
    doc.roundedRect(pX, linkBoxY, linkColWidth, 30, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(COLORS.slateLight[0], COLORS.slateLight[1], COLORS.slateLight[2]);
    doc.text(p.label.toUpperCase(), pX + 6, linkBoxY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.orangeDark[0], COLORS.orangeDark[1], COLORS.orangeDark[2]);
    const valText = p.val ? p.val.replace(/^https?:\/\//, '') : '—';
    const splitVal = doc.splitTextToSize(valText, linkColWidth - 12);
    doc.text(splitVal[0] || '—', pX + 6, linkBoxY + 22);
  });

  curY = linkBoxY + 38;

  // Bio if present
  if (member.bio && member.bio.trim()) {
    const bioLines = doc.splitTextToSize(member.bio.trim(), contentWidth - 16);
    const bioBoxHeight = Math.max(30, bioLines.length * 9.5 + 16);

    if (curY + bioBoxHeight <= pageHeight - 40) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(COLORS.borderSlate[0], COLORS.borderSlate[1], COLORS.borderSlate[2]);
      doc.roundedRect(margin, curY, contentWidth, bioBoxHeight, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.slateLight[0], COLORS.slateLight[1], COLORS.slateLight[2]);
      doc.text('VISION & BIO', margin + 8, curY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(COLORS.slateText[0], COLORS.slateText[1], COLORS.slateText[2]);
      doc.text(bioLines, margin + 8, curY + 20);
    }
  }

  // Footer on bottom of page
  doc.setDrawColor(COLORS.borderSlate[0], COLORS.borderSlate[1], COLORS.borderSlate[2]);
  doc.line(margin, pageHeight - 30, margin + contentWidth, pageHeight - 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COLORS.slateMuted[0], COLORS.slateMuted[1], COLORS.slateMuted[2]);
  doc.text('AWS Student Builder Group (CU-UP) • Official Founding Member Directory', margin, pageHeight - 18);

  const issueDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  doc.text(`Generated: ${issueDate} • Status: ${member.status || 'Active'}`, margin + contentWidth, pageHeight - 18, { align: 'right' });
}

/**
 * Generate a PDF Buffer for a single Founding Member.
 */
export async function generateSingleFoundingMemberPdf(
  member: FoundingMember,
  options: PdfOptions = {}
): Promise<Buffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  drawFoundingMemberPage(doc, member, options.formConfig, true);
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate a combined PDF Buffer for multiple Founding Members (1 member per page).
 */
export async function generateMultipleFoundingMembersPdf(
  members: FoundingMember[],
  options: PdfOptions = {}
): Promise<Buffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  if (members.length === 0) {
    doc.text('No Founding Members Selected', 40, 50);
    return Buffer.from(doc.output('arraybuffer'));
  }

  members.forEach((m, idx) => {
    drawFoundingMemberPage(doc, m, options.formConfig, idx === 0);
  });

  return Buffer.from(doc.output('arraybuffer'));
}
