import { EmailTemplate, EmailType, EmailCategory } from '@/types/email';

export function escapeHtml(str: string | number | undefined | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strips HTML tags to produce a clean plain-text fallback.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Base AWS SBG CU-UP HTML Email Layout
 * Fully responsive, cross-client compatible (Gmail, Outlook, Apple Mail), WCAG compliant.
 */
export function renderEmailLayout(params: {
  title: string;
  preheader?: string;
  headerBadge?: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNotes?: string;
}): string {
  const { title, preheader, headerBadge, contentHtml, ctaText, ctaUrl, footerNotes } = params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.awssbgcuup.tech';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0B1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #0F172A; border-radius: 16px; overflow: hidden; border: 1px solid #1E293B; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
    .header-bar { background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 32px; text-align: left; border-bottom: 3px solid #FF9900; }
    .logo-container { display: flex; align-items: center; justify-content: space-between; }
    .header-title { font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; margin-top: 12px; }
    .header-title span { color: #FF9900; }
    .header-sub { font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .header-badge { float: right; background: rgba(255, 153, 0, 0.15); color: #FF9900; border: 1px solid #FF9900; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }
    .content-body { padding: 32px; color: #E2E8F0; font-size: 14px; line-height: 1.65; background-color: #0F172A; }
    .content-body h1, .content-body h2, .content-body h3 { color: #F8FAFC; margin-top: 0; }
    .card-box { background-color: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .card-title { font-size: 12px; font-weight: 700; color: #FF9900; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 6px; }
    .card-row { margin-bottom: 10px; font-size: 13px; display: flex; }
    .card-label { color: #94A3B8; font-weight: 600; width: 140px; min-width: 140px; }
    .card-value { color: #F8FAFC; font-weight: 700; }
    .btn-cta { display: inline-block; background-color: #FF9900; color: #0F172A !important; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 8px; text-align: center; margin: 20px 0; box-shadow: 0 4px 12px rgba(255, 153, 0, 0.3); }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 800; font-size: 11px; text-transform: uppercase; }
    .status-pass { background-color: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid #10B981; }
    .status-fail { background-color: rgba(244, 63, 94, 0.2); color: #F43F5E; border: 1px solid #F43F5E; }
    .footer-bar { background-color: #0B1120; padding: 24px 32px; font-size: 11px; color: #64748B; line-height: 1.6; border-top: 1px solid #1E293B; text-align: center; }
    .footer-links a { color: #94A3B8; text-decoration: none; margin: 0 8px; font-weight: 600; }
    .footer-links a:hover { color: #FF9900; }
    .preheader { display: none !important; max-height: 0; overflow: hidden; mso-hide: all; }
  </style>
</head>
<body>
  ${preheader ? `<div class="preheader">${escapeHtml(preheader)}</div>` : ''}
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0B1120">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <div class="email-container">
          <!-- Header -->
          <div class="header-bar">
            ${headerBadge ? `<div class="header-badge">${escapeHtml(headerBadge)}</div>` : ''}
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="left">
                  <div class="header-title">AWS <span>Student Builder Group</span></div>
                  <div class="header-sub">Chandigarh University – Uttar Pradesh</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Body Content -->
          <div class="content-body">
            ${contentHtml}

            ${
              ctaText && ctaUrl
                ? `<div style="text-align: center; margin-top: 28px; margin-bottom: 12px;">
                    <a href="${escapeHtml(ctaUrl)}" target="_blank" class="btn-cta">${escapeHtml(ctaText)} &rarr;</a>
                  </div>`
                : ''
            }

            ${
              footerNotes
                ? `<div style="font-size: 12px; color: #94A3B8; margin-top: 24px; padding-top: 16px; border-top: 1px dashed #334155;">
                    ${footerNotes}
                  </div>`
                : ''
            }
          </div>

          <!-- Footer -->
          <div class="footer-bar">
            <div style="font-weight: 700; color: #E2E8F0; margin-bottom: 4px; font-size: 12px;">
              AWS Student Builder Group at Chandigarh University – Uttar Pradesh
            </div>
            <div>A student-led cloud computing & emerging technology learning community.</div>
            <div style="margin-top: 12px;" class="footer-links">
              <a href="${siteUrl}" target="_blank">Portal Home</a> •
              <a href="${siteUrl}/events" target="_blank">Events</a> •
              <a href="${siteUrl}/opportunities" target="_blank">Opportunities</a> •
              <a href="${siteUrl}/exam" target="_blank">Assessments</a> •
              <a href="${siteUrl}/contact" target="_blank">Contact Support</a>
            </div>
            <div style="margin-top: 14px; font-size: 10px; color: #475569;">
              This is an official transactional notification from AWS SBG CU-UP.
            </div>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Interpolates variables in a template string (e.g. `{{studentName}}`).
 * Safely handles missing keys.
 */
export function interpolateVariables(template: string, variables: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (key in variables) {
      const val = variables[key];
      if (val === null || val === undefined) return '';
      return String(val);
    }
    return match;
  });
}

/**
 * Extracts variable names from a template string.
 */
export function extractVariables(template: string): string[] {
  if (!template) return [];
  const matches = template.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  if (!matches) return [];
  const set = new Set<string>();
  for (const m of matches) {
    const key = m.replace(/[\{\}\s]/g, '');
    if (key) set.add(key);
  }
  return Array.from(set);
}

/**
 * Official Built-in Email Templates for AWS SBG CU-UP
 */
export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  // 1. Event Registration Confirmation
  {
    id: 'tpl-event_registration_confirmation',
    name: 'Event Registration Confirmation',
    type: 'event_registration_confirmation',
    category: 'EVENTS',
    subject: 'Registration Confirmed: {{eventTitle}}',
    description: 'Triggered immediately when a candidate registers for any published workshop or event.',
    variables: ['studentName', 'eventTitle', 'eventDate', 'eventTime', 'eventVenue', 'eventMode', 'registrationId', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Congratulations! Your registration for <strong>{{eventTitle}}</strong> has been successfully confirmed.</p>

<div class="card-box">
  <div class="card-title">Session Details</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr><td style="color:#94A3B8; width:130px; padding:4px 0; font-size:13px;">Event:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{eventTitle}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Date:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{eventDate}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Time:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{eventTime}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Venue:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{eventVenue}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Mode:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{eventMode}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Registration ID:</td><td style="color:#FF9900; font-weight:700; font-family:monospace; font-size:13px;">{{registrationId}}</td></tr>
  </table>
</div>

<p>Please arrive 10 minutes prior to the session start time. Bring your Student ID card for check-in verification.</p>
<p>We look forward to seeing you there!</p>`,
    bodyText: `Dear {{studentName}},

Your registration for "{{eventTitle}}" is confirmed!

Event Details:
- Date: {{eventDate}}
- Time: {{eventTime}}
- Venue: {{eventVenue}}
- Mode: {{eventMode}}
- Registration ID: {{registrationId}}

Please arrive 10 minutes prior to the scheduled start time.

Best regards,
AWS Student Builder Group (CU-UP)`
  },

  // 2. Event 24-Hour Reminder
  {
    id: 'tpl-event_24h_reminder',
    name: 'Event 24-Hour Reminder',
    type: 'event_24h_reminder',
    category: 'EVENTS',
    subject: 'Reminder: {{eventTitle}} is Tomorrow',
    description: 'Scheduled reminder sent 24 hours prior to session commencement.',
    variables: ['studentName', 'eventTitle', 'eventDate', 'eventTime', 'eventVenue', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>This is a friendly reminder that <strong>{{eventTitle}}</strong> takes place tomorrow!</p>

<div class="card-box">
  <div class="card-title">Schedule Check</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr><td style="color:#94A3B8; width:130px; padding:4px 0; font-size:13px;">Date:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{eventDate}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Time:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{eventTime}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Venue:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{eventVenue}}</td></tr>
  </table>
</div>

<p>Make sure to have your laptop charged if you are attending a hands-on architectural session.</p>`,
    bodyText: `Dear {{studentName}},

Reminder: "{{eventTitle}}" takes place tomorrow on {{eventDate}} at {{eventTime}} at {{eventVenue}}.

Best regards,
AWS SBG CU-UP Events Desk`
  },

  // 3. Event 1-Hour Reminder
  {
    id: 'tpl-event_1h_reminder',
    name: 'Event 1-Hour Reminder',
    type: 'event_1h_reminder',
    category: 'EVENTS',
    subject: 'Starting Soon: {{eventTitle}} in 1 Hour',
    description: 'Sent 1 hour prior to session commencement.',
    variables: ['studentName', 'eventTitle', 'eventTime', 'eventVenue', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p><strong>{{eventTitle}}</strong> starts in just 1 hour!</p>

<div class="card-box">
  <div class="card-title">Immediate Check-In</div>
  <p style="margin:0; font-size:13px; color:#F8FAFC;">Time: <strong>{{eventTime}}</strong></p>
  <p style="margin:4px 0 0 0; font-size:13px; color:#F8FAFC;">Venue: <strong>{{eventVenue}}</strong></p>
</div>

<p>Check-in gates are now open. We look forward to welcoming you.</p>`,
    bodyText: `Dear {{studentName}},

"{{eventTitle}}" starts in 1 hour at {{eventTime}} (Venue: {{eventVenue}}).

Best regards,
AWS SBG CU-UP Events Desk`
  },

  // 4. Event Updated / Rescheduled
  {
    id: 'tpl-event_updated',
    name: 'Event Schedule Update',
    type: 'event_updated',
    category: 'EVENTS',
    subject: 'Update: Schedule Change for {{eventTitle}}',
    description: 'Sent when admin updates event timing, venue, or key details.',
    variables: ['studentName', 'eventTitle', 'eventDate', 'eventTime', 'eventVenue', 'updateNotes', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Please note an important update regarding <strong>{{eventTitle}}</strong>:</p>

<div class="card-box">
  <div class="card-title">Updated Schedule</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr><td style="color:#94A3B8; width:130px; padding:4px 0; font-size:13px;">New Date:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{eventDate}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">New Time:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{eventTime}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Venue:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{eventVenue}}</td></tr>
  </table>
  ${'<p style="margin-top:12px; font-size:12px; color:#CBD5E1;"><em>{{updateNotes}}</em></p>'}
</div>

<p>Your existing registration remains valid.</p>`,
    bodyText: `Dear {{studentName}},

Update regarding "{{eventTitle}}":
New Date: {{eventDate}}
New Time: {{eventTime}}
Venue: {{eventVenue}}
Notes: {{updateNotes}}

Your registration remains active.

Best regards,
AWS SBG CU-UP Events Desk`
  },

  // 5. Event Cancelled
  {
    id: 'tpl-event_cancelled',
    name: 'Event Cancellation Notice',
    type: 'event_cancelled',
    category: 'EVENTS',
    subject: 'Notice: Cancellation of {{eventTitle}}',
    description: 'Sent to registrants if an event is cancelled.',
    variables: ['studentName', 'eventTitle', 'cancellationReason', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>We regret to inform you that <strong>{{eventTitle}}</strong> has been cancelled.</p>

<div class="card-box">
  <div class="card-title">Reason for Cancellation</div>
  <p style="margin:0; font-size:13px; color:#F8FAFC;">{{cancellationReason}}</p>
</div>

<p>We apologize for any inconvenience caused. Stay tuned to our portal for upcoming rescheduled sessions.</p>`,
    bodyText: `Dear {{studentName}},

We regret to inform you that "{{eventTitle}}" has been cancelled.
Reason: {{cancellationReason}}

Best regards,
AWS SBG CU-UP Events Desk`
  },

  // 6. Opportunity Application Received
  {
    id: 'tpl-opportunity_application_received',
    name: 'Opportunity Application Received',
    type: 'opportunity_application_received',
    category: 'OPPORTUNITIES',
    subject: 'Application Received: {{opportunityTitle}}',
    description: 'Sent immediately when an applicant submits an opportunity or core team form.',
    variables: ['studentName', 'opportunityTitle', 'role', 'applicationId', 'opportunityUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Thank you for applying for <strong>{{opportunityTitle}}</strong> with the AWS Student Builder Group at Chandigarh University – Uttar Pradesh.</p>

<div class="card-box">
  <div class="card-title">Application Summary</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr><td style="color:#94A3B8; width:130px; padding:4px 0; font-size:13px;">Role / Track:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{opportunityTitle}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Application ID:</td><td style="color:#FF9900; font-weight:700; font-family:monospace; font-size:13px;">{{applicationId}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Status:</td><td style="color:#38BDF8; font-weight:700; font-size:13px;">Under Initial Review</td></tr>
  </table>
</div>

<p>Our evaluation committee is reviewing submissions. We will notify you by email as your application progresses.</p>`,
    bodyText: `Dear {{studentName}},

Your application for "{{opportunityTitle}}" (Application ID: {{applicationId}}) has been successfully received.

Our committee will review your profile and communicate updates via email.

Best regards,
AWS SBG CU-UP Career & Opportunities Desk`
  },

  // 7. Opportunity Shortlisted / Selected / Rejected
  {
    id: 'tpl-opportunity_shortlisted',
    name: 'Opportunity Shortlisted',
    type: 'opportunity_shortlisted',
    category: 'OPPORTUNITIES',
    subject: 'Shortlisted: {{opportunityTitle}}',
    description: 'Sent when candidate is shortlisted for interviews or round 2.',
    variables: ['studentName', 'opportunityTitle', 'nextSteps', 'opportunityUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Congratulations! You have been <strong>Shortlisted</strong> for the <strong>{{opportunityTitle}}</strong> role.</p>

<div class="card-box">
  <div class="card-title">Next Steps & Instructions</div>
  <p style="margin:0; font-size:13px; color:#F8FAFC;">{{nextSteps}}</p>
</div>

<p>Please check your email and portal messages for scheduling details.</p>`,
    bodyText: `Dear {{studentName}},

You have been shortlisted for "{{opportunityTitle}}".
Next Steps: {{nextSteps}}

Best regards,
AWS SBG CU-UP Career Desk`
  },

  {
    id: 'tpl-opportunity_selected',
    name: 'Opportunity Selected',
    type: 'opportunity_selected',
    category: 'OPPORTUNITIES',
    subject: 'Offer & Selection: {{opportunityTitle}}',
    description: 'Sent to candidates selected for the role.',
    variables: ['studentName', 'opportunityTitle', 'onboardingNotes', 'opportunityUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Congratulations! We are thrilled to offer you the position of <strong>{{opportunityTitle}}</strong> in the AWS Student Builder Group at Chandigarh University – Uttar Pradesh.</p>

<div class="card-box">
  <div class="card-title">Onboarding & Next Steps</div>
  <p style="margin:0; font-size:13px; color:#F8FAFC;">{{onboardingNotes}}</p>
</div>

<p>Welcome aboard to the core team!</p>`,
    bodyText: `Dear {{studentName}},

Congratulations! You have been selected for "{{opportunityTitle}}".
Onboarding details: {{onboardingNotes}}

Best regards,
AWS SBG CU-UP Leadership`
  },

  // 7b. Opportunity Rejected / Regret Notice
  {
    id: 'tpl-opportunity_rejected',
    name: 'Opportunity Application Regret',
    type: 'opportunity_rejected',
    category: 'OPPORTUNITIES',
    subject: 'Application Update: {{opportunityTitle}}',
    description: 'Sent when an application is not moved forward.',
    variables: ['studentName', 'opportunityTitle', 'notes', 'opportunityUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Thank you for your interest and for taking the time to apply for <strong>{{opportunityTitle}}</strong> with the AWS Student Builder Group at Chandigarh University – Uttar Pradesh.</p>
<div class="card-box">
  <div class="card-title">Committee Note</div>
  <p style="margin:0; font-size:13px; color:#F8FAFC;">We received a large number of outstanding applications. While we are unable to offer you this position at this time, we were impressed by your passion for cloud computing.</p>
</div>
<p>We encourage you to participate in our upcoming workshops, hackathons, and future recruitment cycles.</p>`,
    bodyText: `Dear {{studentName}},

Thank you for applying for "{{opportunityTitle}}".
While we are unable to offer you this position at this time, we encourage you to stay involved in our upcoming community events and future opportunities.

Best regards,
AWS SBG CU-UP Recruitment Committee`
  },

  // 8. Exam Credentials & Instructions
  {
    id: 'tpl-exam_instructions',
    name: 'Exam Credentials & Access Key',
    type: 'exam_instructions',
    category: 'EXAMS',
    subject: 'Exam Entry Credentials: {{examName}}',
    description: 'Sent to verified candidates with their exam entry code, password, and lobby link.',
    variables: ['studentName', 'examName', 'examCode', 'examPassword', 'durationMinutes', 'examUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Your access credentials for the upcoming certification assessment <strong>{{examName}}</strong> are ready.</p>

<div class="card-box">
  <div class="card-title">Assessment Credentials</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr><td style="color:#94A3B8; width:140px; padding:4px 0; font-size:13px;">Assessment:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{examName}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Exam Code:</td><td style="color:#FF9900; font-weight:700; font-family:monospace; font-size:13px;">{{examCode}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Access Password:</td><td style="color:#38BDF8; font-weight:700; font-family:monospace; font-size:13px;">{{examPassword}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Duration:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{durationMinutes}} Minutes</td></tr>
  </table>
</div>

<p>Join the Exam Lobby on time. Proctors will verify your identity before unlocking the examination.</p>`,
    bodyText: `Dear {{studentName}},

Exam Credentials for "{{examName}}":
- Exam Code: {{examCode}}
- Password: {{examPassword}}
- Duration: {{durationMinutes}} Minutes

Access the lobby at: {{examUrl}}

Best regards,
AWS SBG CU-UP Examination Board`
  },

  // 8b. Exam Reminder
  {
    id: 'tpl-exam_reminder',
    name: 'Exam Schedule Reminder',
    type: 'exam_reminder',
    category: 'EXAMS',
    subject: 'Reminder: Assessment Schedule for {{examName}}',
    description: 'Sent prior to exam start time.',
    variables: ['studentName', 'examName', 'examCode', 'durationMinutes', 'examUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>This is a reminder that your scheduled technical assessment <strong>{{examName}}</strong> is starting soon.</p>
<div class="card-box">
  <div class="card-title">Exam Overview</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr><td style="color:#94A3B8; width:140px; padding:4px 0; font-size:13px;">Assessment:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{examName}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Exam Code:</td><td style="color:#FF9900; font-weight:700; font-family:monospace; font-size:13px;">{{examCode}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Duration:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{durationMinutes}} Minutes</td></tr>
  </table>
</div>
<p>Ensure a stable internet connection and have your student ID ready for proctor verification.</p>`,
    bodyText: `Dear {{studentName}},

Reminder: Your assessment "{{examName}}" (Exam Code: {{examCode}}) is starting soon.
Duration: {{durationMinutes}} Minutes

Best regards,
AWS SBG CU-UP Examination Board`
  },

  // 8c. Admin Custom Announcement
  {
    id: 'tpl-admin_custom_announcement',
    name: 'Official Announcement Broadcast',
    type: 'admin_custom_announcement',
    category: 'COMMUNITY',
    subject: 'Official Announcement: {{announcementTitle}}',
    description: 'Sent for official broadcast announcements.',
    variables: ['announcementTitle', 'announcementDate', 'announcementCategory', 'announcementContent', 'ctaUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear AWS SBG Community Member,</p>
<p>We are pleased to share an official announcement with you:</p>
<div class="card-box">
  <div class="card-title">{{announcementTitle}}</div>
  <div style="font-size:11px; color:#94A3B8; margin-bottom:10px;">{{announcementCategory}} • {{announcementDate}}</div>
  <div style="font-size:13px; color:#F8FAFC; line-height:1.6;">{{announcementContent}}</div>
</div>`,
    bodyText: `Official Announcement: {{announcementTitle}}
{{announcementCategory}} - {{announcementDate}}

{{announcementContent}}

Best regards,
AWS Student Builder Group (CU-UP)`
  },

  // 9. Exam Submitted Successfully
  {
    id: 'tpl-exam_submitted_confirmation',
    name: 'Exam Submission Confirmation',
    type: 'exam_submitted_confirmation',
    category: 'EXAMS',
    subject: 'Exam Response Recorded: {{examName}}',
    description: 'Sent immediately upon student submission. Strictly acknowledges response recording without exposing scores.',
    variables: ['studentName', 'examName', 'rollNumber', 'submittedAt'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Your examination response for <strong>{{examName}}</strong> has been successfully received and recorded.</p>

<div class="card-box">
  <div class="card-title">Submission Receipt</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr><td style="color:#94A3B8; width:140px; padding:4px 0; font-size:13px;">Candidate:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{studentName}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Roll Number:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{rollNumber}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Assessment:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{examName}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Status:</td><td style="color:#10B981; font-weight:700; font-size:13px;">Response Recorded</td></tr>
  </table>
</div>

<p>Your responses are undergoing authoritative server-side evaluation. Your official result will be communicated separately by email.</p>`,
    bodyText: `Dear {{studentName}},

Your assessment response for "{{examName}}" (Roll: {{rollNumber}}) has been recorded.

Your result will be communicated separately by email.

Best regards,
AWS SBG CU-UP Examination Board`
  },

  // 10. Official Exam Result Scorecard (EMAIL ONLY)
  {
    id: 'tpl-exam_result',
    name: 'Official Exam Result Scorecard',
    type: 'exam_result',
    category: 'EXAMS',
    subject: 'Official Assessment Result: {{examName}}',
    description: 'Delivers candidate score, percentage, and PASS/FAIL verdict strictly via email.',
    variables: ['studentName', 'examName', 'rollNumber', 'score', 'totalMarks', 'percentage', 'verdict', 'verdictColor', 'passingPercentage'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Your assessment responses for <strong>{{examName}}</strong> have been evaluated.</p>

<div class="card-box">
  <div class="card-title">Official Scorecard</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr><td style="color:#94A3B8; width:140px; padding:4px 0; font-size:13px;">Candidate Name:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{studentName}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Roll / Student ID:</td><td style="color:#F8FAFC; font-weight:700; font-family:monospace; font-size:13px;">{{rollNumber}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Earned Score:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{score}} / {{totalMarks}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Percentage:</td><td style="color:#FF9900; font-weight:800; font-size:14px;">{{percentage}}%</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Passing Benchmark:</td><td style="color:#94A3B8; font-size:13px;">{{passingPercentage}}%</td></tr>
    <tr><td style="color:#94A3B8; padding:6px 0; font-size:13px;">Final Verdict:</td><td><span class="status-badge" style="background-color:rgba(255,153,0,0.15); color:{{verdictColor}}; border:1px solid {{verdictColor}};">{{verdict}}</span></td></tr>
  </table>
</div>

<p>Thank you for participating in the AWS SBG technical assessment.</p>`,
    bodyText: `Dear {{studentName}},

Assessment Result for "{{examName}}":
- Candidate: {{studentName}}
- Roll Number: {{rollNumber}}
- Score: {{score}} / {{totalMarks}}
- Percentage: {{percentage}}%
- Passing Threshold: {{passingPercentage}}%
- Verdict: {{verdict}}

Best regards,
AWS Student Builder Group (CU-UP)`
  },

  // 11. Exam Selected / Qualified
  {
    id: 'tpl-exam_selected_qualified',
    name: 'Candidate Qualification Notice',
    type: 'exam_selected_qualified',
    category: 'EXAMS',
    subject: 'Congratulations! Selected & Qualified in {{examName}}',
    description: 'Dispatched when Admin marks a candidate as Selected / Qualified.',
    variables: ['studentName', 'examName', 'rollNumber', 'selectionNotes'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Congratulations! Based on your technical performance in <strong>{{examName}}</strong>, the evaluation committee has marked you as <strong>SELECTED &amp; QUALIFIED</strong>.</p>

<div class="card-box">
  <div class="card-title">Proctor / Committee Notes</div>
  <p style="margin:0; font-size:13px; color:#F8FAFC;">{{selectionNotes}}</p>
</div>

<p>Our team will reach out with the next technical milestones and opportunities.</p>`,
    bodyText: `Dear {{studentName}},

Congratulations! You have been SELECTED & QUALIFIED in "{{examName}}".
Evaluation Notes: {{selectionNotes}}

Best regards,
AWS SBG CU-UP Evaluation Committee`
  },

  // 12. Feedback Received Acknowledgement
  {
    id: 'tpl-feedback_received_acknowledgement',
    name: 'Feedback Received Acknowledgement',
    type: 'feedback_received_acknowledgement',
    category: 'COMMUNITY',
    subject: 'Thank you for your feedback — AWS SBG CU-UP',
    description: 'Sent when a student or community member submits feedback on the website.',
    variables: ['studentName', 'category', 'messageSummary'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Thank you for reaching out to the AWS Student Builder Group at Chandigarh University – Uttar Pradesh.</p>
<p>We have received your submission under the <strong>{{category}}</strong> category.</p>

<div class="card-box">
  <div class="card-title">Feedback Acknowledged</div>
  <p style="margin:0; font-size:13px; color:#94A3B8; font-style:italic;">"{{messageSummary}}"</p>
</div>

<p>Our team reviews all community input to continuously improve our workshops and student programs.</p>`,
    bodyText: `Dear {{studentName}},

Thank you for your feedback regarding "{{category}}". We appreciate your contribution to improving our community initiatives.

Best regards,
AWS SBG CU-UP Community Team`
  },

  // 13. Admin Manual Message
  {
    id: 'tpl-admin_manual_message',
    name: 'Admin Manual Communication',
    type: 'admin_manual_message',
    category: 'ADMIN',
    subject: '{{subject}}',
    description: 'Template for direct admin broadcasts and manual messages.',
    variables: ['recipientName', 'messageContent'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>Dear <strong>{{recipientName}}</strong>,</p>
<div>{{messageContent}}</div>`,
    bodyText: `Dear {{recipientName}},

{{messageContent}}

Best regards,
AWS Student Builder Group (CU-UP)`
  },

  // 14. System Test Email
  {
    id: 'tpl-system_test_email',
    name: 'System Test Email',
    type: 'system_test_email',
    category: 'ADMIN',
    subject: 'AWS SBG CU-UP — System Test Dispatch',
    description: 'Sent during live Resend provider verification and admin test dispatches.',
    variables: ['timestamp', 'provider', 'adminUser'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<p>This is a <strong>live verification email</strong> dispatched from the AWS SBG CU-UP Centralized Email Service.</p>

<div class="card-box">
  <div class="card-title">Provider Connection Status</div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr><td style="color:#94A3B8; width:140px; padding:4px 0; font-size:13px;">Provider:</td><td style="color:#10B981; font-weight:700; font-size:13px;">Resend (awssbgcuup.tech)</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Dispatched At:</td><td style="color:#F8FAFC; font-weight:700; font-size:13px;">{{timestamp}}</td></tr>
    <tr><td style="color:#94A3B8; padding:4px 0; font-size:13px;">Triggered By:</td><td style="color:#FF9900; font-weight:700; font-size:13px;">{{adminUser}}</td></tr>
  </table>
</div>

<p>If you received this message, the email infrastructure is healthy, verified, and operational.</p>`,
    bodyText: `AWS SBG CU-UP Live Test Email

Provider: Resend (awssbgcuup.tech)
Dispatched At: {{timestamp}}
Triggered By: {{adminUser}}

All email services are fully operational.`
  }
];
