import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail, sendBatchEmails } from '@/lib/email';
import { EmailRecipient, EmailType, EmailBatchSummary } from '@/types/email';
import {
  DEFAULT_EMAIL_TEMPLATES,
  interpolateVariables,
  renderEmailLayout
} from '@/lib/email/templates';
import { OFFICIAL_SENDERS, getSenderForEmailType } from '@/lib/email/senders';
import { logEmailAudit } from '@/lib/email/logger';
import { isValidEmail, normalizeEmail } from '@/lib/email/validation';
import { siteConfig } from '@/data/siteConfig';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === SECURE_TOKEN) {
    return true;
  }
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader.includes(`admin_token=${SECURE_TOKEN}`)) {
    return true;
  }
  return false;
}

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const {
      mode = 'single', // 'single' | 'batch' | 'registration_batch' | 'member_batch' | 'founding_members_batch'
      from,
      to,
      cc,
      bcc,
      recipients, // Array<EmailRecipient | string> for manual batch
      registrationIds, // Array<string> of selected registration IDs
      memberIds, // Array<string> of selected Founding Member IDs
      purpose, // Human readable purpose e.g. "Founding Members Announcement"
      customNotes, // Notes or reason for update/cancel/important notice
      subject,
      contentHtml,
      contentText,
      templateId,
      type = 'admin_manual_message' as EmailType,
      attachments,
      adminId = 'admin',
      isTest = false,
      registrationId,
      memberId,
      recipientName,
      metadata = {}
    } = body;

    // 1. BULK SEND TO SELECTED EVENT REGISTRATIONS (Server-Side Authoritative Resolution)
    if (mode === 'registration_batch' || (Array.isArray(registrationIds) && registrationIds.length > 0)) {
      if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
        return NextResponse.json(
          { error: 'Registration IDs list is required for student bulk email dispatch.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      // Fetch authoritative database records
      const allRegistrations = await db.eventRegistrations.getAll();
      const allEvents = await db.events.getAll();
      const allTemplates = await db.emailTemplates.getAll();

      // Find matching registration records
      const matchedRegs = allRegistrations.filter((r: any) => registrationIds.includes(r.id));
      if (matchedRegs.length === 0) {
        return NextResponse.json(
          { error: 'No matching event registration records found for the provided IDs.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      // Find Base Template
      const baseTemplate =
        (templateId && allTemplates.find((t: any) => t.id === templateId)) ||
        allTemplates.find((t: any) => t.type === type && t.isActive) ||
        DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === type) ||
        DEFAULT_EMAIL_TEMPLATES[0];

      const senderAddress = getSenderForEmailType(type, baseTemplate.category, from);
      const batchId = `batch_reg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const summary: EmailBatchSummary = {
        total: matchedRegs.length,
        sent: 0,
        failed: 0,
        simulated: 0,
        errors: [],
        batchId
      };

      // Deduplicate recipients by normalized email
      const seenEmails = new Set<string>();
      const deduplicatedRegs: any[] = [];

      for (const reg of matchedRegs) {
        const norm = normalizeEmail(reg.email || '');
        if (!isValidEmail(norm)) {
          summary.failed++;
          summary.errors.push({
            recipient: reg.email || 'INVALID_EMAIL',
            error: 'Invalid recipient email address format',
            registrationId: reg.id,
            name: reg.name
          });
          continue;
        }

        if (seenEmails.has(norm)) {
          continue; // Skip duplicate email address in the same batch
        }
        seenEmails.add(norm);
        deduplicatedRegs.push(reg);
      }

      // Process each student individually with personalized data
      for (const reg of deduplicatedRegs) {
        try {
          const matchingEvent =
            allEvents.find((e: any) => e.id === reg.eventId) ||
            allEvents.find((e: any) => e.title === reg.eventName) ||
            null;

          const studentName = reg.name?.trim() || 'Student';
          const eventTitle = matchingEvent?.title || reg.eventName || 'AWS Cloud Event';
          const eventDate = matchingEvent?.date || 'TBA';
          const eventTime = matchingEvent?.time || '10:00 AM IST';
          const eventVenue = matchingEvent?.venue || 'Auditorium Block A, Chandigarh University – UP';
          const eventMode = matchingEvent?.mode || 'In-Person';
          const eventUrl = matchingEvent
            ? `https://www.awssbgcuup.tech/events/${matchingEvent.id}`
            : 'https://www.awssbgcuup.tech/events';
          const certId = reg.certificateId || `AWS-SBG-${new Date().getFullYear()}-${reg.id.slice(-6).toUpperCase()}`;

          const vars: Record<string, any> = {
            studentName,
            fullName: studentName,
            name: studentName,
            recipientName: studentName,
            email: reg.email,
            eventTitle,
            eventName: eventTitle,
            eventDate,
            date: eventDate,
            eventTime,
            time: eventTime,
            eventVenue,
            venue: eventVenue,
            eventMode,
            mode: eventMode,
            registrationId: reg.id,
            eventUrl,
            updateNotes: customNotes || 'Schedule and location details have been updated.',
            cancellationReason: customNotes || 'Unforeseen scheduling constraints.',
            messageContent: customNotes || 'Important update regarding your workshop registration.',
            feedbackUrl: 'https://www.awssbgcuup.tech/feedback',
            certificateId: certId,
            certificateUrl: 'https://www.awssbgcuup.tech/verification'
          };

          let rawBodyHtml = baseTemplate.bodyHtml;
          let rawBodyText = baseTemplate.bodyText;

          if (type === 'event_important_info' || type === 'custom_message') {
            rawBodyHtml = `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        OFFICIAL EVENT ADVISORY
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Important <span style="color: #FF9900;">Notice</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Please review this important announcement regarding <strong>{{eventTitle}}</strong>.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- MESSAGE CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 14px; color: #0F172A; line-height: 1.7; white-space: pre-wrap;">
{{messageContent}}
            </div>
          </td>
        </tr>
      </table>

      <!-- EVENT DETAILS SUMMARY -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFF7ED" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 12px; font-weight: 800; color: #9A3412; margin-bottom: 6px;">
              Session Reference
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.5;">
              <strong>Event:</strong> {{eventTitle}}<br />
              <strong>Registration ID:</strong> {{registrationId}}<br />
              <strong>Venue:</strong> {{eventVenue}}
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="{{eventUrl}}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              View Event Portal &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
          } else if (contentHtml) {
            rawBodyHtml = contentHtml;
          }

          const currentSubj = subject || baseTemplate.subject;
          const finalSubject = interpolateVariables(currentSubj, vars);
          const finalBodyHtml = interpolateVariables(rawBodyHtml, vars);
          const finalBodyText = interpolateVariables(rawBodyText, vars);

          const fullHtml = renderEmailLayout({
            title: finalSubject,
            contentHtml: finalBodyHtml
          });

          const sendResult = await sendEmail({
            from: senderAddress,
            to: reg.email,
            subject: finalSubject,
            html: fullHtml,
            text: finalBodyText,
            type,
            category: baseTemplate.category,
            templateId: baseTemplate.id,
            triggeredBy: `ADMIN_BULK (${adminId})`,
            adminId,
            metadata: {
              batchId,
              registrationId: reg.id,
              studentName: reg.name,
              eventName: eventTitle,
              purpose: purpose || baseTemplate.name || type,
              sender: senderAddress
            }
          });

          if (sendResult.success) {
            summary.sent++;
            if (sendResult.status === 'SIMULATED') {
              summary.simulated++;
            }
          } else {
            summary.failed++;
            summary.errors.push({
              recipient: reg.email,
              error: sendResult.error || 'Failed to dispatch via email provider.',
              registrationId: reg.id,
              name: reg.name
            });
          }

          // Small throttling pause to maintain rate safety
          await new Promise((resolve) => setTimeout(resolve, 30));
        } catch (itemErr: any) {
          summary.failed++;
          summary.errors.push({
            recipient: reg.email,
            error: itemErr.message || 'Unexpected error processing student email.',
            registrationId: reg.id,
            name: reg.name
          });
        }
      }

      // Log administrative audit record
      await logEmailAudit({
        adminUser: adminId,
        action: 'BULK_EVENT_REGISTRATIONS_EMAIL',
        details: {
          batchId,
          total: deduplicatedRegs.length,
          sent: summary.sent,
          failed: summary.failed,
          purpose: purpose || type,
          type
        }
      });

      return NextResponse.json(
        {
          success: true,
          message: `Bulk dispatch completed: ${summary.sent} sent, ${summary.failed} failed.`,
          summary
        },
        { headers: noStoreHeaders }
      );
    }

    // 2. BULK SEND TO SELECTED FOUNDING MEMBERS / CORE TEAM (Server-Side Authoritative Resolution)
    if (mode === 'member_batch' || mode === 'founding_members_batch' || (Array.isArray(memberIds) && memberIds.length > 0)) {
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return NextResponse.json(
          { error: 'Member IDs list is required for Founding Members bulk email dispatch.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      // Fetch authoritative database records from dedicated Founding Members data store
      const allFoundingMembers = await db.foundingMembers.getAll();
      const allTemplates = await db.emailTemplates.getAll();

      // Find matching founding member records (match by id or email)
      const matchedMembers = allFoundingMembers.filter((m: any) =>
        memberIds.includes(m.id) || memberIds.includes(m.email?.toLowerCase())
      );

      if (matchedMembers.length === 0) {
        return NextResponse.json(
          { error: 'No matching founding member records found for the provided IDs.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      // Find Base Template
      const baseTemplate =
        (templateId && allTemplates.find((t: any) => t.id === templateId)) ||
        allTemplates.find((t: any) => t.type === type && t.isActive) ||
        DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === type) ||
        DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === 'founding_members_announcement') ||
        DEFAULT_EMAIL_TEMPLATES[0];

      const senderAddress = getSenderForEmailType(type, 'TEAM', from || OFFICIAL_SENDERS.COMMUNICATION);
      const batchId = `batch_team_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const summary: EmailBatchSummary = {
        total: matchedMembers.length,
        sent: 0,
        failed: 0,
        simulated: 0,
        errors: [],
        batchId
      };

      // Deduplicate recipients by normalized email
      const seenEmails = new Set<string>();
      const deduplicatedMembers: any[] = [];

      for (const member of matchedMembers) {
        const norm = normalizeEmail(member.email || '');
        if (!isValidEmail(norm)) {
          summary.failed++;
          summary.errors.push({
            recipient: member.email || 'INVALID_EMAIL',
            error: 'Invalid recipient email address format',
            memberId: member.id,
            name: member.name,
            role: member.role,
            domain: member.domain
          });
          continue;
        }
        if (seenEmails.has(norm)) {
          continue;
        }
        seenEmails.add(norm);
        deduplicatedMembers.push(member);
      }

      // Process batch with safe rate-limited iteration (30ms spacing)
      for (const member of deduplicatedMembers) {
        try {
          const memberName = member.fullName?.trim() || member.name?.trim() || 'Founding Member';
          const memberRole = member.role?.trim() || 'Founding Member';
          const memberDomain = member.domain?.trim() || member.skills || 'Cloud & Technology';
          const memberEmail = member.email?.trim() || '';
          const formToken = member.formToken || '';
          const formLink = formToken ? `https://www.awssbgcuup.tech/founding-members/form/${formToken}` : '';

          const vars: Record<string, any> = {
            memberName,
            memberRole,
            memberDomain,
            memberEmail,
            formLink,
            formToken,
            studentName: memberName,
            name: memberName,
            fullName: memberName,
            recipientName: memberName,
            role: memberRole,
            domain: memberDomain,
            email: memberEmail,
            messageContent: customNotes || contentText || 'Important update regarding AWS SBG CU-UP founding team operations.',
            announcementTitle: subject || baseTemplate.subject || 'Founding Members Update',
            meetingAgenda: subject || metadata?.meetingAgenda || 'Founding Members Operations Sync',
            meetingTime: metadata?.meetingTime || 'To be coordinated with team',
            meetingVenue: metadata?.meetingVenue || 'Auditorium Block A / Google Meet',
            meetingLink: metadata?.meetingLink || 'https://www.awssbgcuup.tech/leadership',
            eventTitle: metadata?.eventTitle || 'AWS Community Workshop',
            eventDate: metadata?.eventDate || 'Upcoming',
            eventVenue: metadata?.eventVenue || 'Chandigarh University – UP',
            updateSubject: subject || 'Internal Founding Members Memo'
          };

          let rawBodyHtml = contentHtml || baseTemplate.bodyHtml;
          let rawBodyText = contentText || baseTemplate.bodyText;

          const currentSubj = subject || baseTemplate.subject;
          const finalSubject = interpolateVariables(currentSubj, vars);
          const finalBodyHtml = interpolateVariables(rawBodyHtml, vars);
          const finalBodyText = interpolateVariables(rawBodyText, vars);

          const fullHtml = finalBodyHtml.includes('<!DOCTYPE html')
            ? finalBodyHtml
            : renderEmailLayout({
                title: finalSubject,
                contentHtml: finalBodyHtml
              });

          const sendResult = await sendEmail({
            from: senderAddress,
            to: member.email,
            recipientName: member.name,
            subject: finalSubject,
            html: fullHtml,
            text: finalBodyText,
            type,
            category: 'TEAM',
            templateId: baseTemplate.id,
            triggeredBy: `ADMIN_BULK (${adminId})`,
            adminId,
            metadata: {
              batchId,
              memberId: member.id,
              studentName: member.name,
              role: member.role,
              domain: member.domain,
              purpose: purpose || baseTemplate.name || type,
              sender: senderAddress
            }
          });

          if (sendResult.success) {
            summary.sent++;
            if (sendResult.status === 'SIMULATED') summary.simulated++;
          } else {
            summary.failed++;
            summary.errors.push({
              recipient: member.email,
              error: sendResult.error || 'Failed to dispatch via Resend provider.',
              memberId: member.id,
              name: member.name,
              role: member.role,
              domain: member.domain
            });
          }

          // Safety Throttling: 30ms sleep between dispatches
          await new Promise((resolve) => setTimeout(resolve, 30));
        } catch (itemErr: any) {
          summary.failed++;
          summary.errors.push({
            recipient: member.email,
            error: itemErr.message || 'Unexpected error processing team member email.',
            memberId: member.id,
            name: member.name
          });
        }
      }

      // Log administrative audit record
      await logEmailAudit({
        adminUser: adminId,
        action: 'BULK_FOUNDING_MEMBERS_EMAIL',
        details: {
          batchId,
          total: deduplicatedMembers.length,
          sent: summary.sent,
          failed: summary.failed,
          purpose: purpose || type,
          type
        }
      });

      return NextResponse.json(
        {
          success: true,
          message: `Founding Members bulk dispatch completed: ${summary.sent} sent, ${summary.failed} failed.`,
          summary
        },
        { headers: noStoreHeaders }
      );
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json(
        { error: 'Email subject is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    // 3. Generic Manual Batch
    if (mode === 'batch') {
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json(
          { error: 'Recipients list is required for batch email dispatch.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const summary = await sendBatchEmails({
        recipients,
        from,
        subject: subject.trim(),
        templateId,
        type,
        customHtml: contentHtml,
        customText: contentText,
        triggeredBy: 'ADMIN_MANUAL_BATCH',
        adminId
      });

      return NextResponse.json(
        {
          success: true,
          message: `Batch complete: ${summary.sent} sent, ${summary.failed} failed.`,
          summary
        },
        { headers: noStoreHeaders }
      );
    }

    // 4. Single Send: Resolve registration record or team member record server-side if ID is provided
    let resolvedRecipient = to;
    let resolvedStudentName = recipientName || metadata?.studentName || metadata?.memberName || '';
    let resolvedEventName = metadata?.eventName || metadata?.eventTitle || '';

    if (registrationId) {
      try {
        const allRegistrations = await db.eventRegistrations.getAll();
        const reg = allRegistrations.find((r: any) => r.id === registrationId);
        if (reg) {
          resolvedRecipient = reg.email;
          resolvedStudentName = reg.name;
          resolvedEventName = reg.eventName;
        }
      } catch (dbErr) {
        console.error('Failed to query registration record for email dispatch:', dbErr);
      }
    } else if (memberId) {
      try {
        const allMembers = await db.foundingMembers.getAll();
        const member = allMembers.find((m: any) => m.id === memberId || m.email?.toLowerCase() === memberId?.toLowerCase());
        if (member) {
          resolvedRecipient = member.email;
          resolvedStudentName = member.fullName || member.name;
        }
      } catch (dbErr) {
        console.error('Failed to query founding member for email dispatch:', dbErr);
      }
    }

    if (!resolvedRecipient || (typeof resolvedRecipient !== 'string' && !Array.isArray(resolvedRecipient))) {
      return NextResponse.json(
        { error: 'Recipient "to" address is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const result = await sendEmail({
      from,
      to: resolvedRecipient,
      cc,
      bcc,
      subject: subject.trim(),
      html: contentHtml || `<p>${subject}</p>`,
      text: contentText,
      templateId,
      type,
      attachments,
      triggeredBy: `Admin (${adminId})`,
      adminId,
      isTest,
      metadata: {
        ...metadata,
        registrationId: registrationId || undefined,
        studentName: resolvedStudentName || undefined,
        eventName: resolvedEventName || undefined,
        purpose: metadata?.purpose || type
      }
    });

    return NextResponse.json(
      {
        success: result.success,
        result
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in /api/admin/email/send:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while sending email.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}


