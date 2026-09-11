import { EmailTemplate, EmailType } from '@/types/email';

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
 * Base AWS SBG CU-UP HTML Email Layout
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header-bar { background-color: #0F172A; padding: 24px 32px; text-align: left; border-bottom: 3px solid #FF9900; }
    .header-logo { font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; display: inline-block; }
    .header-logo span { color: #FF9900; }
    .header-badge { float: right; background: rgba(255, 153, 0, 0.15); color: #FF9900; border: 1px solid #FF9900; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }
    .content-body { padding: 32px; color: #334155; font-size: 14px; line-height: 1.6; }
    .card-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px 20px; margin: 20px 0; }
    .card-title { font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .card-row { margin-bottom: 8px; font-size: 13px; }
    .card-label { color: #64748B; font-weight: 600; width: 140px; display: inline-block; }
    .card-value { color: #0F172A; font-weight: 700; }
    .btn-cta { display: inline-block; background-color: #FF9900; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px; text-align: center; margin: 16px 0; box-shadow: 0 2px 4px rgba(255, 153, 0, 0.2); }
    .footer-bar { background-color: #F1F5F9; padding: 24px 32px; font-size: 12px; color: #64748B; line-height: 1.5; border-top: 1px solid #E2E8F0; text-align: center; }
    .footer-links a { color: #475569; text-decoration: underline; margin: 0 6px; }
    .preheader { display: none; max-height: 0; overflow: hidden; }
  </style>
</head>
<body>
  ${preheader ? `<div class="preheader">${escapeHtml(preheader)}</div>` : ''}
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F8FAFC">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <div class="email-container">
          <!-- Header -->
          <div class="header-bar">
            ${headerBadge ? `<div class="header-badge">${escapeHtml(headerBadge)}</div>` : ''}
            <div class="header-logo">AWS <span>SBG</span> CU-UP</div>
            <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">Student Builder Group • Chandigarh University – Uttar Pradesh</div>
          </div>

          <!-- Body -->
          <div class="content-body">
            ${contentHtml}

            ${
              ctaText && ctaUrl
                ? `<div style="text-align: center; margin-top: 24px; margin-bottom: 12px;">
                    <a href="${escapeHtml(ctaUrl)}" target="_blank" class="btn-cta">${escapeHtml(ctaText)} &rarr;</a>
                  </div>`
                : ''
            }

            ${
              footerNotes
                ? `<div style="font-size: 12px; color: #94A3B8; margin-top: 24px; padding-top: 16px; border-top: 1px dashed #E2E8F0;">
                    ${footerNotes}
                  </div>`
                : ''
            }
          </div>

          <!-- Footer -->
          <div class="footer-bar">
            <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">AWS Student Builder Group at Chandigarh University – Uttar Pradesh</div>
            <div>A student-led cloud & emerging technology community.</div>
            <div style="margin-top: 10px;" class="footer-links">
              <a href="https://www.awssbgcuup.tech" target="_blank">Website</a> •
              <a href="https://www.awssbgcuup.tech/events" target="_blank">Events</a> •
              <a href="https://www.awssbgcuup.tech/exam" target="_blank">Certifications</a> •
              <a href="https://www.awssbgcuup.tech/contact" target="_blank">Contact Support</a>
            </div>
            <div style="margin-top: 12px; font-size: 11px; color: #94A3B8;">
              This is an official transactional message from AWS SBG CU-UP.
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
 * Default Built-in Email Templates
 */
export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  // 1. Event Registration Confirmation
  {
    id: 'tpl-event-reg-confirm',
    name: 'Event Registration Confirmation',
    type: 'event_registration_confirmation',
    category: 'EVENTS',
    subject: 'Registration Confirmed: {{eventName}}',
    description: 'Sent automatically when a student registers for an upcoming community event.',
    variables: ['studentName', 'eventName', 'eventDate', 'eventTime', 'venue', 'registrationId', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyText: `Dear {{studentName}},

Your registration for "{{eventName}}" has been confirmed!

Event Details:
- Event: {{eventName}}
- Date: {{eventDate}}
- Time: {{eventTime}}
- Venue / Link: {{venue}}
- Registration ID: {{registrationId}}

View Event Details: {{eventUrl}}

Best regards,
AWS Student Builder Group at Chandigarh University – Uttar Pradesh`,
    bodyHtml: `<h2 style="color: #0F172A; font-size: 20px; margin-top: 0; margin-bottom: 8px;">Registration Confirmed! 🎉</h2>
<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Thank you for registering for our upcoming session. Your seat is confirmed.</p>

<div class="card-box">
  <div class="card-title">📅 Event Schedule &amp; Venue</div>
  <div class="card-row"><span class="card-label">Event:</span> <span class="card-value">{{eventName}}</span></div>
  <div class="card-row"><span class="card-label">Date:</span> <span class="card-value">{{eventDate}}</span></div>
  <div class="card-row"><span class="card-label">Time:</span> <span class="card-value">{{eventTime}}</span></div>
  <div class="card-row"><span class="card-label">Venue:</span> <span class="card-value">{{venue}}</span></div>
  <div class="card-row"><span class="card-label">Registration ID:</span> <span class="card-value font-mono">{{registrationId}}</span></div>
</div>

<p>Please arrive 10 minutes prior to the session start time. Bring your laptop and student ID for check-in.</p>`
  },

  // 2. Event 24-Hour Reminder
  {
    id: 'tpl-event-24h-reminder',
    name: 'Event 24-Hour Reminder',
    type: 'event_24h_reminder',
    category: 'EVENTS',
    subject: 'Reminder: {{eventName}} is tomorrow!',
    description: 'Sent 24 hours prior to scheduled event start time.',
    variables: ['studentName', 'eventName', 'eventDate', 'eventTime', 'venue', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyText: `Dear {{studentName}},

This is a friendly reminder that "{{eventName}}" is scheduled for tomorrow.

Event Schedule:
- Date: {{eventDate}}
- Time: {{eventTime}}
- Venue: {{venue}}

Event Link: {{eventUrl}}

See you tomorrow!
AWS SBG CU-UP`,
    bodyHtml: `<h2 style="color: #0F172A; font-size: 20px; margin-top: 0; margin-bottom: 8px;">See you tomorrow! ⏰</h2>
<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Just a quick reminder that <strong>{{eventName}}</strong> is taking place tomorrow.</p>

<div class="card-box">
  <div class="card-title">📅 Quick Schedule</div>
  <div class="card-row"><span class="card-label">Event:</span> <span class="card-value">{{eventName}}</span></div>
  <div class="card-row"><span class="card-label">Date:</span> <span class="card-value">{{eventDate}}</span></div>
  <div class="card-row"><span class="card-label">Time:</span> <span class="card-value">{{eventTime}}</span></div>
  <div class="card-row"><span class="card-label">Venue:</span> <span class="card-value">{{venue}}</span></div>
</div>`
  },

  // 3. Opportunity Application Received
  {
    id: 'tpl-opp-received',
    name: 'Opportunity Application Received',
    type: 'opportunity_application_received',
    category: 'OPPORTUNITIES',
    subject: 'Application Received: {{opportunityTitle}}',
    description: 'Sent automatically when a candidate submits an application for core team or leadership roles.',
    variables: ['studentName', 'opportunityTitle', 'role', 'applicationId', 'opportunityUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyText: `Dear {{studentName}},

Thank you for applying for "{{opportunityTitle}}". Your application has been received and is being reviewed by the AWS SBG CU-UP selection committee.

Application Summary:
- Position: {{opportunityTitle}}
- Role: {{role}}
- Application Reference: {{applicationId}}

We will get back to you regarding the next steps.

Best regards,
AWS Student Builder Group at Chandigarh University – Uttar Pradesh`,
    bodyHtml: `<h2 style="color: #0F172A; font-size: 20px; margin-top: 0; margin-bottom: 8px;">Application Received 🚀</h2>
<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Thank you for your interest in joining AWS Student Builder Group at Chandigarh University – Uttar Pradesh. Your application has been logged successfully.</p>

<div class="card-box">
  <div class="card-title">📋 Application Reference</div>
  <div class="card-row"><span class="card-label">Opportunity:</span> <span class="card-value">{{opportunityTitle}}</span></div>
  <div class="card-row"><span class="card-label">Role:</span> <span class="card-value">{{role}}</span></div>
  <div class="card-row"><span class="card-label">Reference ID:</span> <span class="card-value font-mono">{{applicationId}}</span></div>
</div>

<p>Our core review committee will review your submission. Shortlisted candidates will be contacted via email for interaction rounds.</p>`
  },

  // 4. Certification Exam Official Result
  {
    id: 'tpl-exam-result',
    name: 'Certification Exam Evaluation Result',
    type: 'exam_result',
    category: 'EXAMS',
    subject: 'Assessment Result: {{examName}}',
    description: 'Sent after candidate exam submission is evaluated server-side. Displays authoritative score and verdict.',
    variables: ['studentName', 'rollNumber', 'examName', 'examCode', 'score', 'totalMarks', 'percentage', 'verdict', 'passingPercentage'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyText: `Dear {{studentName}},

Your assessment response for "{{examName}}" (Code: {{examCode}}) has been evaluated.

Assessment Summary:
----------------------------------------
Candidate Name: {{studentName}}
Roll Number / Student ID: {{rollNumber}}
Score: {{score}} / {{totalMarks}}
Percentage: {{percentage}}%
Verdict: {{verdict}}
Minimum Passing Percentage: {{passingPercentage}}%
----------------------------------------

Thank you for participating in the assessment.

Best regards,
AWS Student Builder Group
Chandigarh University – Uttar Pradesh`,
    bodyHtml: `<h2 style="color: #0F172A; font-size: 20px; margin-top: 0; margin-bottom: 8px;">Assessment Evaluation Result 📊</h2>
<p>Dear <strong>{{studentName}}</strong>,</p>
<p>Your assessment submission for <strong>{{examName}}</strong> has been evaluated server-side.</p>

<div class="card-box">
  <div class="card-title">🎯 Scorecard &amp; Verdict</div>
  <div class="card-row"><span class="card-label">Candidate:</span> <span class="card-value">{{studentName}} ({{rollNumber}})</span></div>
  <div class="card-row"><span class="card-label">Assessment:</span> <span class="card-value">{{examName}} ({{examCode}})</span></div>
  <div class="card-row"><span class="card-label">Score:</span> <span class="card-value font-mono">{{score}} / {{totalMarks}}</span></div>
  <div class="card-row"><span class="card-label">Percentage:</span> <span class="card-value font-mono">{{percentage}}%</span></div>
  <div class="card-row"><span class="card-label">Required:</span> <span class="card-value">{{passingPercentage}}%</span></div>
  <div class="card-row" style="margin-top: 10px;">
    <span class="card-label">Final Verdict:</span> 
    <span class="card-value" style="font-size: 15px; color: {{verdictColor}};">{{verdict}}</span>
  </div>
</div>

<p>Thank you for demonstrating your technical competencies. Further cohort communication will be shared via official email.</p>`
  },

  // 5. Exam Selection / Qualified Notification
  {
    id: 'tpl-exam-selected',
    name: 'Candidate Selected & Qualified Notification',
    type: 'exam_selected_qualified',
    category: 'EXAMS',
    subject: 'Congratulations! Selected in {{examName}}',
    description: 'Sent when proctors qualify a candidate for special cohorts or workshops.',
    variables: ['studentName', 'rollNumber', 'examName', 'selectionNotes'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyText: `Dear {{studentName}},

Congratulations! You have been SELECTED & QUALIFIED in the "{{examName}}" assessment.

Details:
Roll Number / Student ID: {{rollNumber}}
{{selectionNotes}}

Our team will follow up with further cohort orientation details.

Best regards,
AWS Student Builder Group
Chandigarh University – Uttar Pradesh`,
    bodyHtml: `<h2 style="color: #0F172A; font-size: 20px; margin-top: 0; margin-bottom: 8px;">Congratulations on Selection! 🌟</h2>
<p>Dear <strong>{{studentName}}</strong>,</p>
<p>We are pleased to inform you that you have been <strong>SELECTED &amp; QUALIFIED</strong> based on your performance in <strong>{{examName}}</strong>.</p>

<div class="card-box" style="border-left: 4px solid #10B981;">
  <div class="card-title" style="color: #10B981;">🏆 Qualification Details</div>
  <div class="card-row"><span class="card-label">Candidate Name:</span> <span class="card-value">{{studentName}}</span></div>
  <div class="card-row"><span class="card-label">Roll Number:</span> <span class="card-value font-mono">{{rollNumber}}</span></div>
  <div class="card-row"><span class="card-label">Assessment:</span> <span class="card-value">{{examName}}</span></div>
  ${'{{#selectionNotes}}'}<div class="card-row"><span class="card-label">Proctor Note:</span> <span class="card-value">{{selectionNotes}}</span></div>${'{{/selectionNotes}}'}
</div>

<p>Our team will reach out with the next phase of hands-on cloud tracks and cohort access.</p>`
  },

  // 6. Admin Manual Announcement / Community Message
  {
    id: 'tpl-admin-announcement',
    name: 'Admin Community Announcement',
    type: 'admin_custom_announcement',
    category: 'ADMIN',
    subject: '{{subject}}',
    description: 'Custom message or announcement dispatched by an authorized Administrator.',
    variables: ['studentName', 'subject', 'messageContent', 'ctaText', 'ctaUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyText: `Dear {{studentName}},

{{messageContent}}

Best regards,
AWS Student Builder Group at Chandigarh University – Uttar Pradesh`,
    bodyHtml: `<p>Dear <strong>{{studentName}}</strong>,</p>
<div>{{messageContent}}</div>`
  },

  // 7. Feedback Received Acknowledgement
  {
    id: 'tpl-feedback-ack',
    name: 'Feedback Received Acknowledgement',
    type: 'feedback_received_acknowledgement',
    category: 'COMMUNITY',
    subject: 'Thank you for your feedback! (AWS SBG CU-UP)',
    description: 'Sent when a student submits community feedback or an inquiry.',
    variables: ['studentName', 'feedbackCategory', 'feedbackMessage'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyText: `Dear {{studentName}},

Thank you for sharing your feedback with AWS Student Builder Group at Chandigarh University – Uttar Pradesh.

Category: {{feedbackCategory}}
Message: {{feedbackMessage}}

Our organizing team reviews every suggestion to continuously improve our workshops and events.

Best regards,
AWS SBG CU-UP Team`,
    bodyHtml: `<h2 style="color: #0F172A; font-size: 20px; margin-top: 0; margin-bottom: 8px;">Thank You for Your Feedback! 💬</h2>
<p>Dear <strong>{{studentName}}</strong>,</p>
<p>We appreciate you taking the time to share your thoughts with AWS SBG CU-UP.</p>

<div class="card-box">
  <div class="card-title">📝 Feedback Details</div>
  <div class="card-row"><span class="card-label">Category:</span> <span class="card-value">{{feedbackCategory}}</span></div>
  <div class="card-row"><span class="card-label">Feedback:</span> <span class="card-value italic">{{feedbackMessage}}</span></div>
</div>

<p>Your feedback helps us make future community events, hands-on bootcamps, and certification resources better for everyone.</p>`
  }
];

/**
 * Interpolates variables into a template string safely
 */
export function interpolateVariables(templateStr: string, variables: Record<string, any>): string {
  if (!templateStr) return '';
  return templateStr.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    if (variables[key] !== undefined && variables[key] !== null) {
      return String(variables[key]);
    }
    return match;
  });
}

/**
 * Extracts unique variable placeholders from a template string
 */
export function extractVariables(templateStr: string): string[] {
  if (!templateStr) return [];
  const matches = templateStr.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/[\{\}]/g, ''))));
}

