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
 * Premium AWS SBG CU-UP HTML Email Layout
 * Fully responsive, cross-client compatible (Gmail, Outlook, Apple Mail, Yahoo), WCAG compliant.
 * Matches official reference design:
 * - White Outer & Inner Container
 * - Top Header: Chandigarh University Logo (1:1 square) + Community Branding + AWS SBG Logo
 * - Full-width Campus Hero Banner (cu-campus-hero.png / cu-campus-hero-dark.png)
 * - Navy Typography (#0F172A) & AWS-Orange Accents (#FF9900)
 * - Polished White Footer with 4 Circular Social Icons, Site Link & Mandatory Do Not Reply notice
 */
export function renderEmailLayout(params: {
  title: string;
  preheader?: string;
  headerBadge?: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNotes?: string;
  inlineCid?: boolean;
}): string {
  const { title, preheader, contentHtml: rawContentHtml, ctaText, ctaUrl, footerNotes } = params;
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.awssbgcuup.tech';
  const siteUrl = rawSiteUrl.replace(/\/+$/, '');
  const currentYear = new Date().getFullYear();

  // Verified public HTTPS image URLs for logos: renders reliably in Gmail without adding unwanted attachments
  const cuLogoUrl = `${siteUrl}/chandigarh-university-logo.jpg`;
  const awsLogoSmileUrl = 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png';

  let contentHtml = rawContentHtml;
  // Route legacy logo CIDs to public HTTPS URLs
  contentHtml = contentHtml
    .replace(/cid:aws-sbg-logo/g, awsLogoSmileUrl)
    .replace(/cid:aws-logo/g, awsLogoSmileUrl)
    .replace(/cid:cu-logo/g, cuLogoUrl);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F4F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
    .preheader { display: none !important; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #F4F5F7; }
    
    /* Responsive styling */
    @media screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .mobile-p-16 { padding: 16px !important; }
      .mobile-p-20 { padding: 20px 16px !important; }
      .mobile-hide { display: none !important; }
      .mobile-center { text-align: center !important; }
      .mobile-w-full { width: 100% !important; max-width: 100% !important; }
      .hero-title-mobile { font-size: 22px !important; line-height: 1.25 !important; }
      .header-right { display: none !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F5F7;">
  ${preheader ? `<div class="preheader">${escapeHtml(preheader)}</div>` : ''}

  <!-- Outer Full Width Background -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F4F5F7" style="background-color: #F4F5F7; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 8px 36px 8px;">
        <!-- Center Email Container (600px) -->
        <table class="email-container" width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0;">
          
          <!-- 1. TOP BRANDED HEADER BAR -->
          <tr>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 18px 24px; border-bottom: 1px solid #F1F5F9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Left: AWS Smile Logo + Divider + Community Title -->
                  <td align="left" valign="middle">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- AWS Official Smile Logo -->
                        <td valign="middle" style="padding-right: 14px;">
                          <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: block;">
                            <img src="${awsLogoSmileUrl}" alt="AWS" width="46" height="28" style="display: block; width: 46px; height: auto; max-width: 50px; border: 0; outline: none;" />
                          </a>
                        </td>
                        <!-- Vertical Divider -->
                        <td valign="middle" style="border-left: 1.5px solid #CBD5E1; height: 32px; padding-left: 14px;">
                          <div style="font-size: 14px; font-weight: 800; color: #0F172A; letter-spacing: -0.2px; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            AWS <span style="color: #FF9900;">Student Builder Group</span>
                          </div>
                          <div style="font-size: 10px; font-weight: 700; color: #64748B; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            CHANDIGARH UNIVERSITY – UTTAR PRADESH
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Right: Community Slogan & Chandigarh University Logo (Unmodified, Natural Aspect Ratio) -->
                  <td align="right" valign="middle" class="header-right">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="middle" style="padding-right: 16px;" class="mobile-hide">
                          <span style="font-size: 12px; font-weight: 600; color: #475569; letter-spacing: 0.3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            Learn &nbsp;&bull;&nbsp; Build &nbsp;&bull;&nbsp; Grow
                          </span>
                        </td>
                        <td valign="middle">
                          <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: block;">
                            <img src="${cuLogoUrl}" alt="Chandigarh University" width="48" height="48" style="display: block; width: 48px; height: 48px; max-width: 48px; border: 0; outline: none; object-fit: contain;" />
                          </a>
                          <img src="${siteUrl}/aws-sbg-logo.png" alt="AWS Student Builder Group" width="1" height="1" style="display: none !important; width: 0; height: 0; opacity: 0; visibility: hidden;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 2. MAIN TEMPLATE CONTENT (Campus Hero + White Body) -->
          <tr>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 0;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Optional CTA Button injected if ctaText & ctaUrl are provided outside template content -->
          ${
            ctaText && ctaUrl && !contentHtml.includes('btn-cta-primary')
              ? `<tr>
                  <td bgcolor="#FFFFFF" align="center" style="background-color: #FFFFFF; padding: 12px 24px 28px 24px;">
                    <a href="${escapeHtml(ctaUrl)}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 14px; font-weight: 800; text-decoration: none; padding: 13px 36px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
                      ${escapeHtml(ctaText)} &rarr;
                    </a>
                  </td>
                </tr>`
              : ''
          }

          <!-- Optional Footer Notes -->
          ${
            footerNotes
              ? `<tr>
                  <td bgcolor="#F8FAFC" style="background-color: #F8FAFC; padding: 14px 24px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${footerNotes}
                  </td>
                </tr>`
              : ''
          }

          <!-- 3. BRANDED CLEAN FOOTER -->
          <tr>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 28px 24px 24px 24px; border-top: 1px solid #F1F5F9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <!-- Top Footer Row: Logo Lockup on Left, 4 Social Circles in Center, Website on Right -->
                <tr>
                  <td style="padding-bottom: 18px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- Left: Brand Lockup -->
                        <td align="left" valign="middle" class="mobile-stack" style="padding-bottom: 10px;">
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td valign="middle" style="padding-right: 10px;">
                                <img src="${awsLogoSmileUrl}" alt="AWS" width="34" height="20" style="display: block; width: 34px; height: auto; border: 0;" />
                              </td>
                              <td valign="middle" style="border-left: 1px solid #CBD5E1; padding-left: 10px;">
                                <div style="font-size: 11px; font-weight: 800; color: #0F172A; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                  AWS Student Builder Group
                                </div>
                                <div style="font-size: 9px; color: #64748B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                  Chandigarh University – Uttar Pradesh
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>

                        <!-- Center: 4 Circular Social Icons -->
                        <td align="center" valign="middle" class="mobile-stack" style="padding-bottom: 10px;">
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <!-- LinkedIn -->
                              <td style="padding: 0 4px;">
                                <a href="https://www.linkedin.com/company/aws-sbg-cu/" target="_blank" style="text-decoration: none; display: inline-block;">
                                  <div style="width: 26px; height: 26px; line-height: 26px; border-radius: 50%; background-color: #0A66C2; color: #FFFFFF; text-align: center; font-size: 11px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">in</div>
                                </a>
                              </td>
                              <!-- Instagram -->
                              <td style="padding: 0 4px;">
                                <a href="https://www.instagram.com/awssbgcu/" target="_blank" style="text-decoration: none; display: inline-block;">
                                  <div style="width: 26px; height: 26px; line-height: 26px; border-radius: 50%; background-color: #E1306C; color: #FFFFFF; text-align: center; font-size: 11px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">ig</div>
                                </a>
                              </td>
                              <!-- YouTube -->
                              <td style="padding: 0 4px;">
                                <a href="https://www.youtube.com/@awssbgcu" target="_blank" style="text-decoration: none; display: inline-block;">
                                  <div style="width: 26px; height: 26px; line-height: 26px; border-radius: 50%; background-color: #FF0000; color: #FFFFFF; text-align: center; font-size: 10px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">yt</div>
                                </a>
                              </td>
                              <!-- X (Twitter) -->
                              <td style="padding: 0 4px;">
                                <a href="https://x.com/awssbgcu" target="_blank" style="text-decoration: none; display: inline-block;">
                                  <div style="width: 26px; height: 26px; line-height: 26px; border-radius: 50%; background-color: #000000; color: #FFFFFF; text-align: center; font-size: 11px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">𝕏</div>
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>

                        <!-- Right: Website Link -->
                        <td align="right" valign="middle" class="mobile-stack" style="padding-bottom: 10px;">
                          <a href="${siteUrl}" target="_blank" style="color: #0F172A; text-decoration: none; font-size: 12px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            www.awssbgcuup.tech
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Disclaimer & Subtext -->
                <tr>
                  <td align="center" style="padding-bottom: 4px;">
                    <p style="margin: 0; font-size: 11px; color: #64748B; text-align: center; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      You&rsquo;re receiving this email because you&rsquo;re part of AWS Student Builder Group, Chandigarh University &ndash; Uttar Pradesh.
                    </p>
                  </td>
                </tr>

                <!-- Preferences Links -->
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <p style="margin: 0; font-size: 11px; color: #94A3B8; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <a href="${siteUrl}/unsubscribe" target="_blank" style="color: #64748B; text-decoration: underline;">Unsubscribe</a> &nbsp;|&nbsp;
                      <a href="${siteUrl}/preferences" target="_blank" style="color: #64748B; text-decoration: underline;">Email preferences</a> &nbsp;|&nbsp;
                      <a href="${siteUrl}" target="_blank" style="color: #64748B; text-decoration: underline;">View in browser</a>
                    </p>
                  </td>
                </tr>

                <!-- MANDATORY "DO NOT REPLY" NOTICE (Requirement: Keep the exact footer notice in every template: “Please do not reply to this email. This inbox is not monitored.”) -->
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <p style="margin: 0; font-size: 11px; font-weight: 600; color: #64748B; text-align: center; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Please do not reply to this email. This inbox is not monitored.
                    </p>
                  </td>
                </tr>

                <!-- Copyright -->
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 10px; color: #94A3B8; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      &copy; ${currentYear} AWS Student Builder Group, CU-UP. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Safe fallback values when an expected variable is not provided.
 */
export const DEFAULT_FALLBACKS: Record<string, string> = {
  studentName: 'Student',
  name: 'Student',
  fullName: 'Student',
  recipientName: 'Student',
  candidateName: 'Candidate',
  userName: 'Student',
  user_name: 'Student',
  userEmail: 'student@university.edu',
  user_email: 'student@university.edu',
  memberName: 'Founding Member',
  memberRole: 'Core Team Lead',
  memberDomain: 'Cloud & Infrastructure',
  memberEmail: '',
  digitalId: 'DID-CUUP-001',
  publicId: 'DID-CUUP-001',
  memberType: 'Core Team',
  verificationUrl: 'https://www.awssbgcuup.tech/verify',
  cardUrl: 'https://www.awssbgcuup.tech/id',
  issuedDate: 'Issued',
  eventVenue: 'Chandigarh University – Uttar Pradesh',
  eventDate: 'TBA',
  eventTime: 'TBA',
  eventMode: 'In-Person',
  eventUrl: 'https://www.awssbgcuup.tech/events',
  registrationId: 'REG-CUUP-001',
  registrationDate: 'Recent',
  registration_date: 'Recent',
  updateDetails: 'Schedule and venue have been updated.',
  update_details: 'Schedule and venue have been updated.',
  newDate: 'TBA',
  new_date: 'TBA',
  newTime: 'TBA',
  new_time: 'TBA',
  newMode: 'In-Person',
  new_mode: 'In-Person',
  expiryTime: '24 hours',
  expiry_time: '24 hours',
  resetUrl: 'https://www.awssbgcuup.tech/reset-password',
  reset_url: 'https://www.awssbgcuup.tech/reset-password',
  adminUrl: 'https://www.awssbgcuup.tech/admin',
  admin_url: 'https://www.awssbgcuup.tech/admin',
  opportunityUrl: 'https://www.awssbgcuup.tech/opportunities',
  examUrl: 'https://www.awssbgcuup.tech/exam',
  examPassword: 'TBA',
  durationMinutes: '60',
  verdictColor: '#FF9900',
  cancellationReason: 'Unforeseen scheduling constraints.',
  updateNotes: 'Schedule and location details have been updated.',
  onboardingNotes: 'Welcome to the team! Our leadership will connect with you soon.',
  nextSteps: 'Check your student inbox for scheduling instructions.',
  selectionNotes: 'Selected & Qualified by Proctor',
  passingPercentage: '60'
};

/**
 * Normalizes input variable map and resolves aliases across all domains (camelCase and snake_case).
 */
export function resolveVariableValue(key: string, variables: Record<string, any>): string | undefined {
  if (variables[key] !== undefined && variables[key] !== null) {
    const val = String(variables[key]).trim();
    if (val.length > 0) return val;
  }

  const lowerKey = key.toLowerCase().replace(/_/g, '');

  // User Name Aliases
  if (['membername', 'studentname', 'name', 'fullname', 'recipientname', 'candidatename', 'username', 'user_name'].includes(lowerKey)) {
    const nameVal =
      variables.name ||
      variables.studentName ||
      variables.student_name ||
      variables.userName ||
      variables.user_name ||
      variables.fullName ||
      variables.full_name ||
      variables.recipientName ||
      variables.recipient_name ||
      variables.candidateName ||
      variables.memberName;
    if (nameVal !== undefined && nameVal !== null) {
      const trimmed = String(nameVal).trim();
      if (trimmed.length > 0) return trimmed;
    }
  }

  // User Email Aliases
  if (['useremail', 'user_email', 'email', 'recipientemail', 'memberemail'].includes(lowerKey)) {
    const emailVal = variables.userEmail || variables.user_email || variables.email || variables.recipientEmail || variables.memberEmail;
    if (emailVal !== undefined && emailVal !== null) return String(emailVal).trim();
  }

  // Event Aliases
  if (['eventtitle', 'eventname', 'title', 'event_title'].includes(lowerKey)) {
    const val = variables.eventTitle || variables.event_title || variables.eventName || variables.event_name || variables.title;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['eventdate', 'date', 'event_date'].includes(lowerKey)) {
    const val = variables.eventDate || variables.event_date || variables.date;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['eventtime', 'time', 'event_time'].includes(lowerKey)) {
    const val = variables.eventTime || variables.event_time || variables.time;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['eventvenue', 'venue', 'location', 'event_venue'].includes(lowerKey)) {
    const val = variables.eventVenue || variables.event_venue || variables.venue || variables.location;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['eventmode', 'mode', 'event_mode'].includes(lowerKey)) {
    const val = variables.eventMode || variables.event_mode || variables.mode;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['registrationid', 'regid', 'id', 'registration_id'].includes(lowerKey)) {
    const val = variables.registrationId || variables.registration_id || variables.regId || variables.id;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['registrationdate', 'registration_date', 'registeredon', 'registered_on'].includes(lowerKey)) {
    const val = variables.registrationDate || variables.registration_date || variables.registeredOn || variables.registered_on || variables.date;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['eventurl', 'url', 'event_url'].includes(lowerKey)) {
    const val = variables.eventUrl || variables.event_url || variables.url;
    if (val !== undefined && val !== null) return String(val).trim();
  }

  // Updates & Reschedule Aliases
  if (['updatedetails', 'update_details', 'updatenotes', 'update_notes'].includes(lowerKey)) {
    const val = variables.updateDetails || variables.update_details || variables.updateNotes || variables.update_notes || variables.details;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['newdate', 'new_date'].includes(lowerKey)) {
    const val = variables.newDate || variables.new_date || variables.eventDate;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['newtime', 'new_time'].includes(lowerKey)) {
    const val = variables.newTime || variables.new_time || variables.eventTime;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['newmode', 'new_mode'].includes(lowerKey)) {
    const val = variables.newMode || variables.new_mode || variables.eventMode;
    if (val !== undefined && val !== null) return String(val).trim();
  }

  // Auth & Token Aliases
  if (['expirytime', 'expiry_time', 'expiry'].includes(lowerKey)) {
    const val = variables.expiryTime || variables.expiry_time || variables.expiry;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['verificationurl', 'verifyurl', 'verify_url', 'verification_url'].includes(lowerKey)) {
    const val = variables.verificationUrl || variables.verification_url || variables.verifyUrl || variables.verify_url;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['reseturl', 'reset_url'].includes(lowerKey)) {
    const val = variables.resetUrl || variables.reset_url;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['adminurl', 'admin_url'].includes(lowerKey)) {
    const val = variables.adminUrl || variables.admin_url;
    if (val !== undefined && val !== null) return String(val).trim();
  }

  // Founding Member Role & Domain Aliases
  if (['memberrole', 'role', 'designation', 'member_role'].includes(lowerKey)) {
    const roleVal = variables.memberRole || variables.role || variables.designation || variables.member_role;
    if (roleVal !== undefined && roleVal !== null) return String(roleVal).trim();
  }
  if (['memberdomain', 'domain', 'department', 'team', 'member_domain'].includes(lowerKey)) {
    const domainVal = variables.memberDomain || variables.domain || variables.department || variables.team || variables.member_domain;
    if (domainVal !== undefined && domainVal !== null) return String(domainVal).trim();
  }

  // Digital ID & Public ID Aliases
  if (['publicid', 'digitalid', 'did', 'memberid'].includes(lowerKey)) {
    const val = variables.publicId || variables.digitalId || variables.did || variables.public_id || variables.digital_id || variables.memberId;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['cardurl', 'digitalcardurl', 'idurl', 'card_url'].includes(lowerKey)) {
    const val = variables.cardUrl || variables.digitalCardUrl || variables.idUrl || variables.card_url;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['issueddate', 'issued_date', 'issuedat', 'issue_date'].includes(lowerKey)) {
    const val = variables.issuedDate || variables.issueDate || variables.issuedAt || variables.issued_date;
    if (val !== undefined && val !== null) return String(val).trim();
  }

  // Exam Aliases
  if (['examname', 'examtitle', 'assessmentname'].includes(lowerKey)) {
    const val = variables.examName || variables.examTitle || variables.title || variables.exam_name;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['examcode', 'code', 'exam_code'].includes(lowerKey)) {
    const val = variables.examCode || variables.code || variables.exam_code;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['exampassword', 'password', 'exam_password'].includes(lowerKey)) {
    const val = variables.examPassword || variables.password || variables.exam_password;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['durationminutes', 'duration', 'duration_minutes'].includes(lowerKey)) {
    const val = variables.durationMinutes || variables.duration || variables.duration_minutes;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['score', 'earnedmarks', 'marks'].includes(lowerKey)) {
    const val = variables.score ?? variables.earnedMarks ?? variables.marks;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['totalmarks', 'maxmarks'].includes(lowerKey)) {
    const val = variables.totalMarks ?? variables.maxMarks;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['percentage', 'percent'].includes(lowerKey)) {
    const val = variables.percentage ?? variables.percent;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['verdict', 'result', 'status'].includes(lowerKey)) {
    const val = variables.verdict || variables.result || variables.status;
    if (val !== undefined && val !== null) return String(val).trim();
  }

  // Opportunity Aliases
  if (['opportunitytitle', 'role', 'position'].includes(lowerKey)) {
    const val = variables.opportunityTitle || variables.role || variables.position || variables.title || variables.opportunity_title;
    if (val !== undefined && val !== null) return String(val).trim();
  }
  if (['applicationid', 'application_id'].includes(lowerKey)) {
    const val = variables.applicationId || variables.application_id || variables.id;
    if (val !== undefined && val !== null) return String(val).trim();
  }

  // General Case-Insensitive fallback
  for (const [vKey, vVal] of Object.entries(variables)) {
    if (vKey.toLowerCase().replace(/_/g, '') === lowerKey && vVal !== undefined && vVal !== null) {
      return String(vVal).trim();
    }
  }

  return undefined;
}

/**
 * Interpolates variables in a template string (e.g. `{{studentName}}` or `{{name}}`).
 */
export function interpolateVariables(template: string, variables: Record<string, any>): string {
  if (!template) return '';

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const resolved = resolveVariableValue(key, variables || {});
    if (resolved !== undefined && resolved !== '') {
      return resolved;
    }

    if (key in DEFAULT_FALLBACKS) {
      return DEFAULT_FALLBACKS[key];
    }
    const lowerKey = key.toLowerCase().replace(/_/g, '');
    for (const [fKey, fVal] of Object.entries(DEFAULT_FALLBACKS)) {
      if (fKey.toLowerCase().replace(/_/g, '') === lowerKey) {
        return fVal;
      }
    }

    return '';
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
 * Reusable Design Component: Hero Banner
 */
export function renderHeroBanner(params: {
  isWelcome?: boolean;
  iconBadge?: string;
  pillBadge?: { text: string; bg?: string; color?: string; icon?: string };
  title: string;
  subtitle?: string;
  inlineCid?: boolean;
}): string {
  const { iconBadge, pillBadge, title, subtitle } = params;

  return `<!-- HERO BANNER (Full Width Campus Image) -->
<table width="100%" border="0" cellspacing="0" cellpadding="0">
  <tr>
    <td align="center" style="padding: 0; line-height: 0;">
      <img src="cid:cu-campus-hero" alt="Chandigarh University Campus" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;" />
    </td>
  </tr>
</table>
<!-- HEADING (On Clean White Background) -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px 24px 8px 24px;">
  <tr>
    <td align="left">
      ${
        pillBadge
          ? `<div style="display: inline-block; background-color: ${pillBadge.bg || '#FFF7ED'}; border: 1px solid #FED7AA; color: ${pillBadge.color || '#EA580C'}; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${pillBadge.icon ? `${pillBadge.icon} &nbsp;` : ''}${pillBadge.text}
            </div>`
          : iconBadge
          ? `<div style="display: inline-block; width: 38px; height: 38px; background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 10px; text-align: center; line-height: 38px; font-size: 18px; margin-bottom: 12px;">
              ${iconBadge}
            </div>`
          : ''
      }
      <h1 class="hero-title-mobile" style="margin: 0 0 6px 0; font-size: 26px; font-weight: 800; color: #0F172A; line-height: 1.25; letter-spacing: -0.4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${title}
      </h1>
      ${
        subtitle
          ? `<div style="margin: 0; font-size: 14px; font-weight: 500; color: #64748B; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${subtitle}
            </div>`
          : ''
      }
      <div style="width: 44px; height: 3px; background-color: #FF9900; border-radius: 2px; margin-top: 14px;"></div>
    </td>
  </tr>
</table>`;
}

/**
 * Reusable Design Component: Details Card
 */
export function renderInfoCard(rows: Array<{ icon: string; label: string; value: string; isMonospace?: boolean }>): string {
  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td width="36" valign="middle" style="width: 36px; padding: 8px 0;">
          <div style="width: 32px; height: 32px; background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px;">
            ${r.icon}
          </div>
        </td>
        <td valign="middle" style="padding: 8px 0 8px 12px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${r.label}
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #0F172A; margin-top: 1px; ${r.isMonospace ? 'font-family: SFMono-Regular, Consolas, monospace; color: #EA580C;' : 'font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;'}">
            ${r.value}
          </div>
        </td>
      </tr>`
    )
    .join('');

  return `<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F8FAFC" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 18px; margin: 18px 0;">
    ${rowsHtml}
  </table>`;
}

/**
 * Reusable Design Component: 3 Feature Columns (Learn / Build / Grow)
 */
export function renderFeatureColumns3(): string {
  return `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0 24px 0;">
    <tr>
      <td width="31%" valign="top" class="mobile-stack" style="padding: 0 4px 10px 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 8px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
          <tr>
            <td align="center">
              <div style="font-size: 24px; margin-bottom: 6px;">📖</div>
              <div style="font-size: 14px; font-weight: 800; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Learn</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">new skills</div>
            </td>
          </tr>
        </table>
      </td>
      <td width="31%" valign="top" class="mobile-stack" style="padding: 0 2px 10px 2px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 8px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
          <tr>
            <td align="center">
              <div style="font-size: 24px; margin-bottom: 6px;">👥</div>
              <div style="font-size: 14px; font-weight: 800; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Build</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">real projects</div>
            </td>
          </tr>
        </table>
      </td>
      <td width="31%" valign="top" class="mobile-stack" style="padding: 0 0 10px 4px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 8px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
          <tr>
            <td align="center">
              <div style="font-size: 24px; margin-bottom: 6px;">🚀</div>
              <div style="font-size: 14px; font-weight: 800; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Grow</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 2px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">your career</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

/**
 * Reusable Design Component: Callout Box
 */
export function renderCalloutBox(params: {
  type: 'quote' | 'alert' | 'highlight' | 'info';
  title?: string;
  text: string;
  icon?: string;
}): string {
  const { type, title, text, icon } = params;

  if (type === 'quote') {
    return `<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F8FAFC" style="background-color: #F8FAFC; border-left: 3px solid #FF9900; border-radius: 4px; padding: 14px 18px; margin: 20px 0;">
      <tr>
        <td valign="middle" width="28" style="padding-right: 10px; font-size: 20px; color: #FF9900;">❝</td>
        <td valign="middle" style="font-size: 13px; font-style: italic; color: #334155; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${text}
        </td>
      </tr>
    </table>`;
  }

  if (type === 'alert') {
    return `<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFF7ED" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 10px; padding: 14px 18px; margin: 18px 0;">
      <tr>
        <td width="36" valign="top" style="width: 36px; padding-right: 12px;">
          <div style="width: 30px; height: 30px; background-color: #FFEDD5; border: 1px solid #FDBA74; border-radius: 50%; text-align: center; line-height: 30px; font-size: 14px; color: #C2410C;">
            ${icon || 'ℹ️'}
          </div>
        </td>
        <td valign="middle">
          ${title ? `<div style="font-size: 13px; font-weight: 800; color: #9A3412; margin-bottom: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${title}</div>` : ''}
          <div style="font-size: 13px; color: #334155; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${text}
          </div>
        </td>
      </tr>
    </table>`;
  }

  return `<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#EFF6FF" style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 14px 18px; margin: 18px 0;">
    <tr>
      <td width="36" valign="top" style="width: 36px; padding-right: 12px;">
        <div style="width: 30px; height: 30px; background-color: #DBEAFE; border: 1px solid #93C5FD; border-radius: 50%; text-align: center; line-height: 30px; font-size: 14px; color: #1D4ED8;">
          ${icon || '★'}
        </div>
      </td>
      <td valign="middle">
        ${title ? `<div style="font-size: 13px; font-weight: 800; color: #1E40AF; margin-bottom: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${title}</div>` : ''}
        <div style="font-size: 13px; color: #334155; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${text}
        </div>
      </td>
    </tr>
  </table>`;
}

/**
 * Reusable Design Component: Call to Action Button
 */
export function renderCtaButton(text: string, url: string, variant: 'orange' | 'navy' = 'orange'): string {
  const isNavy = variant === 'navy';
  const bgStyle = isNavy
    ? 'background-color: #0F172A; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);'
    : 'background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35);';

  return `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
    <tr>
      <td align="left">
        <a href="${url}" target="_blank" class="btn-cta-primary" style="display: inline-block; ${bgStyle} color: #FFFFFF !important; font-size: 14px; font-weight: 800; text-decoration: none; padding: 13px 32px; border-radius: 8px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${text} &rarr;
        </a>
      </td>
    </tr>
  </table>`;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  // 1. Welcome Email (Template 1 in Collage & Reference Design)
  {
    id: 'tpl-welcome_email',
    name: 'Welcome to AWS Student Builder Group',
    type: 'welcome_email',
    category: 'COMMUNITY',
    subject: 'Welcome to the AWS Student Builder Group! 🚀',
    description: 'Welcome email dispatched to students when they join the AWS SBG community.',
    variables: ['name', 'studentName', 'eventUrl', 'url'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `<!-- HERO BANNER (Full Width Campus Image) -->
<table width="100%" border="0" cellspacing="0" cellpadding="0">
  <tr>
    <td align="center" style="padding: 0; line-height: 0;">
      <img src="cid:cu-campus-hero" alt="Chandigarh University Campus" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;" />
    </td>
  </tr>
</table>
<!-- WELCOME CONTENT (On Clean White Background) -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 28px 24px 28px 24px;">
  <tr>
    <td>
      <h1 class="hero-title-mobile" style="margin: 0 0 10px 0; font-size: 30px; font-weight: 800; color: #0F172A; line-height: 1.2; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Build something meaningful.
      </h1>
      <div style="width: 44px; height: 3px; background-color: #FF9900; border-radius: 2px; margin-bottom: 22px;"></div>

      <div style="font-size: 15px; font-weight: 600; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi {{name}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Welcome to the AWS Student Builder Group at Chandigarh University &ndash; Uttar Pradesh! You're now part of a vibrant community of learners, builders and creators who are passionate about cloud, technology and real-world impact with AWS.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Here, you'll get opportunities to learn new skills, work on real projects, attend exciting events and connect with like-minded peers from across campus.
      </p>

      <!-- Primary CTA Button -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0 28px 0;">
        <tr>
          <td align="left">
            <a href="{{eventUrl}}" target="_blank" style="display: inline-block; background-color: #EA580C; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Explore the Community &rarr;
            </a>
          </td>
        </tr>
      </table>

      <!-- Section: What's Happening -->
      <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 28px 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        What's happening
      </div>
      <div style="font-size: 13px; color: #64748B; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Stay involved and make the most of your journey with us.
      </div>

      <!-- 3 Feature Cards Side-by-Side -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
        <tr>
          <!-- Card 1: Upcoming Events -->
          <td width="32%" valign="top" class="mobile-stack" style="padding-right: 8px; padding-bottom: 12px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FAFAFA" style="background-color: #FAFAFA; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 12px; height: 100%;">
              <tr>
                <td>
                  <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #FFF7ED; border: 1px solid #FFEDD5; text-align: center; line-height: 36px; font-size: 18px; margin-bottom: 12px;">
                    📅
                  </div>
                  <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Upcoming events
                  </div>
                  <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Workshops, tech talks, hackathons and more.
                  </div>
                  <a href="{{eventUrl}}" target="_blank" style="font-size: 12px; font-weight: 700; color: #EA580C; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    View events &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>

          <!-- Card 2: Learning Resources -->
          <td width="32%" valign="top" class="mobile-stack" style="padding: 0 4px 12px 4px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FAFAFA" style="background-color: #FAFAFA; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 12px; height: 100%;">
              <tr>
                <td>
                  <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #EFF6FF; border: 1px solid #DBEAFE; text-align: center; line-height: 36px; font-size: 18px; margin-bottom: 12px;">
                    📖
                  </div>
                  <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Learning resources
                  </div>
                  <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Curated content to help you build and grow.
                  </div>
                  <a href="{{eventUrl}}" target="_blank" style="font-size: 12px; font-weight: 700; color: #EA580C; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Explore resources &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>

          <!-- Card 3: Meet the Community -->
          <td width="32%" valign="top" class="mobile-stack" style="padding-left: 8px; padding-bottom: 12px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FAFAFA" style="background-color: #FAFAFA; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 12px; height: 100%;">
              <tr>
                <td>
                  <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #F0FDF4; border: 1px solid #DCFCE7; text-align: center; line-height: 36px; font-size: 18px; margin-bottom: 12px;">
                    👥
                  </div>
                  <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Meet the community
                  </div>
                  <div style="font-size: 12px; color: #64748B; line-height: 1.45; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Connect with peers, mentors and leaders.
                  </div>
                  <a href="{{eventUrl}}" target="_blank" style="font-size: 12px; font-weight: 700; color: #EA580C; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Get involved &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Quote Box / Tagline Box -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F8FAFC" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 18px; margin: 20px 0;">
        <tr>
          <td valign="middle" width="28" style="padding-right: 12px;">
            <span style="font-size: 24px; color: #2563EB; font-family: Georgia, serif; line-height: 1;">&ldquo;</span>
          </td>
          <td valign="middle" align="left">
            <span style="font-size: 13px; font-style: italic; color: #334155; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              A community of students building a brighter future, together.
            </span>
          </td>
          <td valign="middle" align="right" class="mobile-hide" style="padding-left: 16px; white-space: nowrap;">
            <span style="font-size: 12px; font-weight: 700; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <span style="border-bottom: 2px solid #FF9900; padding-bottom: 2px;">Learn</span> &nbsp;|&nbsp; Build &nbsp;|&nbsp; Grow
            </span>
          </td>
        </tr>
      </table>

      <!-- Sign-off -->
      <p style="font-size: 13px; color: #334155; line-height: 1.6; margin: 24px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        See you around,<br/>
        <strong style="color: #0F172A;">The AWS Student Builder Group Team</strong><br/>
        <span style="color: #64748B; font-size: 12px;">Chandigarh University &ndash; Uttar Pradesh</span>
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Build something meaningful.

Hi {{name}},

Welcome to the AWS Student Builder Group at Chandigarh University – Uttar Pradesh! You're now part of a vibrant community of learners, builders and creators who are passionate about cloud, technology and real-world impact with AWS.

Here, you'll get opportunities to learn new skills, work on real projects, attend exciting events and connect with like-minded peers from across campus.

Explore the Community: {{eventUrl}}

What's happening:
- Upcoming events: Workshops, tech talks, hackathons and more.
- Learning resources: Curated content to help you build and grow.
- Meet the community: Connect with peers, mentors and leaders.

"A community of students building a brighter future, together."
Learn | Build | Grow

See you around,
The AWS Student Builder Group Team
Chandigarh University – Uttar Pradesh

Please do not reply to this email. This inbox is not monitored.`
  },

  // 2. Event Registration Confirmation (Template 2 in Collage)
  {
    id: 'tpl-event_registration_confirmation',
    name: 'Event Registration Confirmation',
    type: 'event_registration_confirmation',
    category: 'EVENTS',
    subject: 'Registration Confirmed: {{eventTitle}}',
    description: 'Triggered immediately when a candidate registers for any published workshop or event.',
    variables: ['name', 'studentName', 'event_title', 'eventTitle', 'event_date', 'eventDate', 'event_time', 'eventTime', 'event_mode', 'eventMode', 'event_url', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '🏆',
      title: 'Registration Confirmed!',
      subtitle: "You're all set for the event."
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Your registration for <strong>{{event_title}}</strong> has been successfully confirmed. We're excited to see you there!
      </p>

      ${renderInfoCard([
        { icon: '📅', label: 'Date', value: '{{eventDate}}' },
        { icon: '⏰', label: 'Time', value: '{{eventTime}}' },
        { icon: '📍', label: 'Venue', value: '{{eventVenue}}' },
        { icon: '👥', label: 'Mode', value: '{{eventMode}}' },
        { icon: '🎫', label: 'Registration ID', value: '{{registrationId}}', isMonospace: true }
      ])}

      ${renderCtaButton('View Event Details', '{{event_url}}')}

      <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        You will receive further updates via email. In case of any changes, we'll keep you informed.
      </p>
      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 14px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        See you soon!<br/>
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Registration Confirmed!
You're all set for the event.

Hi {{name}},

Your registration for {{event_title}} has been successfully confirmed. We're excited to see you there!

Event: {{event_title}}
Date: {{event_date}}
Time: {{event_time}}
Mode: {{event_mode}}

View Event Details: {{event_url}}

You will receive further updates via email. In case of any changes, we'll keep you informed.

See you soon!
AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 3. Event 24-Hour Reminder (Template 3 in Collage)
  {
    id: 'tpl-event_24h_reminder',
    name: 'Event 24-Hour Reminder',
    type: 'event_24h_reminder',
    category: 'EVENTS',
    subject: 'Your Event is Almost Here: {{event_title}}',
    description: 'Scheduled broadcast 24 hours prior to event start.',
    variables: ['name', 'studentName', 'event_title', 'eventTitle', 'event_date', 'eventDate', 'event_time', 'eventTime', 'event_mode', 'eventMode', 'event_url', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      pillBadge: { text: 'Upcoming Event', icon: '📅' },
      title: 'Your Event is Almost Here!',
      subtitle: 'Get ready for an exciting session with AWS SBG CU-UP.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This is a friendly reminder for the event you registered for. We're looking forward to your participation!
      </p>

      ${renderInfoCard([
        { icon: '🎟️', label: 'Event', value: '{{event_title}}' },
        { icon: '📅', label: 'Date', value: '{{event_date}}' },
        { icon: '⏰', label: 'Time', value: '{{event_time}}' },
        { icon: '📍', label: 'Mode', value: '{{event_mode}}' }
      ])}

      ${renderCtaButton('Add to Calendar', '{{event_url}}')}

      <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        If you can't attend, please let us know so we can keep others informed.
      </p>
      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 14px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        See you at the event!<br/>
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Your Event is Almost Here!
Get ready for an exciting session with AWS SBG CU-UP.

Dear {{studentName}},

This is a friendly reminder for the event you registered for. We're looking forward to your participation!

Event: {{event_title}}
Date: {{event_date}}
Time: {{event_time}}
Mode: {{event_mode}}

Add to Calendar: {{event_url}}

If you can't attend, please let us know so we can keep others informed.

See you at the event!
AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 4. Event 1-Hour Reminder
  {
    id: 'tpl-event_1h_reminder',
    name: 'Event 1-Hour Reminder',
    type: 'event_1h_reminder',
    category: 'EVENTS',
    subject: 'Starting in 1 Hour: {{event_title}}',
    description: 'Urgent reminder dispatched 1 hour before scheduled start.',
    variables: ['name', 'studentName', 'event_title', 'eventTitle', 'event_date', 'eventDate', 'event_time', 'eventTime', 'event_mode', 'eventMode', 'event_url', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      pillBadge: { text: 'Starting Soon', icon: '⏰', bg: '#DC2626' },
      title: 'Your Event Starts in 1 Hour!',
      subtitle: 'We are getting ready to begin our session with AWS SBG CU-UP.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This is an urgent reminder that <strong>{{event_title}}</strong> starts in just 1 hour! Please make sure your setup or transit is ready.
      </p>

      ${renderInfoCard([
        { icon: '🎟️', label: 'Event', value: '{{event_title}}' },
        { icon: '📅', label: 'Date', value: '{{event_date}}' },
        { icon: '⏰', label: 'Time', value: '{{event_time}}' },
        { icon: '📍', label: 'Mode', value: '{{event_mode}}' }
      ])}

      ${renderCtaButton('Join Session Now', '{{event_url}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        See you shortly!<br/>
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Your Event Starts in 1 Hour!
Event: {{event_title}}
Date: {{event_date}}
Time: {{event_time}}
Mode: {{event_mode}}

Join Session Now: {{event_url}}

See you shortly!
AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 5. Event Schedule Update (Template 4 in Collage)
  {
    id: 'tpl-event_updated',
    name: 'Event Schedule Update',
    type: 'event_updated',
    category: 'EVENTS',
    subject: 'Important Update: {{event_title}}',
    description: 'Sent when venue, schedule, or prerequisites are modified.',
    variables: ['name', 'studentName', 'event_title', 'eventTitle', 'update_details', 'updateDetails', 'new_date', 'newDate', 'new_time', 'newTime', 'new_mode', 'newMode', 'event_url', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      pillBadge: { text: 'Event Update', icon: '📢', bg: '#EA580C' },
      title: 'Important Update',
      subtitle: "There's an update regarding {{event_title}}."
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        We wanted to inform you about a recent update to this event. Please find the updated details below.
      </p>

      ${renderCalloutBox({
        type: 'alert',
        title: "What's Changed?",
        text: '{{update_details}}'
      })}

      ${renderInfoCard([
        { icon: '📅', label: 'New Date', value: '{{new_date}}' },
        { icon: '⏰', label: 'New Time', value: '{{new_time}}' },
        { icon: '📍', label: 'Mode', value: '{{new_mode}}' }
      ])}

      ${renderCtaButton('View Updated Details', '{{event_url}}', 'navy')}

      <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        If you have any questions, reach out to us at our official community portal.
      </p>
      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 14px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Best regards,<br/>
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Important Update
There's an update regarding {{event_title}}.

Dear {{studentName}},

We wanted to inform you about a recent update to this event. Please find the updated details below.

What's Changed?
{{update_details}}

New Date: {{new_date}}
New Time: {{new_time}}
Mode: {{new_mode}}

View Updated Details: {{event_url}}

Best regards,
AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 6. Event Cancellation Notice
  {
    id: 'tpl-event_cancelled',
    name: 'Event Cancellation Notice',
    type: 'event_cancelled',
    category: 'EVENTS',
    subject: 'Event Cancelled: {{event_title}}',
    description: 'Dispatched if an event is cancelled by administrators.',
    variables: ['name', 'studentName', 'event_title', 'eventTitle', 'cancellationReason', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      pillBadge: { text: 'Event Notice', icon: '⚠️', bg: '#475569' },
      title: 'Event Cancelled Notice',
      subtitle: 'An important update regarding {{event_title}}.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        We regret to inform you that <strong>{{event_title}}</strong> has been cancelled due to scheduling constraints. We sincerely apologize for any inconvenience caused.
      </p>

      ${renderCalloutBox({
        type: 'alert',
        title: 'Reason for Cancellation',
        text: '{{cancellationReason}}'
      })}

      ${renderCtaButton('Explore Upcoming Events', '{{eventUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Sincerely,<br/>
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Event Cancelled Notice: {{event_title}}

Dear {{studentName}},

We regret to inform you that {{event_title}} has been cancelled.
Reason: {{cancellationReason}}

Explore other events: {{eventUrl}}

Sincerely,
AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 7. Event Starting Soon Notice
  {
    id: 'tpl-event_starting_soon',
    name: 'Event Starting Soon Notice',
    type: 'event_starting_soon',
    category: 'EVENTS',
    subject: 'Happening Now: {{event_title}}',
    description: 'Broadcast dispatched right as an event commences.',
    variables: ['name', 'studentName', 'event_title', 'eventTitle', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      pillBadge: { text: 'Starting Now', icon: '🚀', bg: '#FF9900' },
      title: 'Event is Starting Now!',
      subtitle: 'Join the session for {{event_title}}.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        The session for <strong>{{event_title}}</strong> is starting right now! Click below to enter the session or access the venue.
      </p>

      ${renderCtaButton('Join Session Now', '{{eventUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        See you inside!<br/>
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Happening Now: {{event_title}}

Dear {{studentName}},
The session for {{event_title}} is starting right now!

Join: {{eventUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 8. Event Feedback Request
  {
    id: 'tpl-event_feedback_request',
    name: 'Event Feedback Request',
    type: 'event_feedback_request',
    category: 'EVENTS',
    subject: 'How was {{event_title}}? Share your feedback!',
    description: 'Sent after event conclusion to collect student feedback.',
    variables: ['name', 'studentName', 'event_title', 'eventTitle', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '⭐',
      title: 'Share Your Thoughts!',
      subtitle: 'How was your experience at {{event_title}}?'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Thank you for attending <strong>{{event_title}}</strong>! We would love to hear your feedback so we can continue bringing you better workshops and sessions.
      </p>

      ${renderCtaButton('Submit Feedback', 'https://www.awssbgcuup.tech/feedback')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Thank you for being part of our community!<br/>
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Share your feedback for {{event_title}}!

Dear {{studentName}},
Thank you for attending {{event_title}}. Please take 1 minute to share your thoughts:
https://www.awssbgcuup.tech/feedback

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 9. Event Certificate Available
  {
    id: 'tpl-event_certificate_available',
    name: 'Event Certificate Available',
    type: 'event_certificate_available',
    category: 'EVENTS',
    subject: 'Your Certificate is Ready: {{event_title}}',
    description: 'Dispatched to verified attendees when event certificates are published.',
    variables: ['name', 'studentName', 'event_title', 'eventTitle', 'eventUrl', 'event_url'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '🎓',
      title: 'Your Certificate is Ready!',
      subtitle: 'Official Certificate of Participation for {{event_title}}'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 12px 24px 28px 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 600; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Hi {{name}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Congratulations! Your official certificate of participation for <strong>{{event_title}}</strong> has been generated and is now ready for download.
      </p>

      ${renderInfoCard([
        { icon: '🎓', label: 'Certificate', value: 'Certificate of Participation' },
        { icon: '📅', label: 'Event Name', value: '{{event_title}}' },
        { icon: '👤', label: 'Issued To', value: '{{studentName}}' },
        { icon: '🏛️', label: 'Issued By', value: 'AWS Student Builder Group &bull; CU-UP' }
      ])}

      <!-- Prominent Download Certificate CTA Button -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 28px 0;">
        <tr>
          <td align="left">
            <a href="{{eventUrl}}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #EA580C; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 14px 36px; border-radius: 8px; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35); text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              Download Certificate &rarr;
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #334155; line-height: 1.6; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Keep building and learning,<br/>
        <strong style="color: #0F172A;">The AWS Student Builder Group Team</strong><br/>
        <span style="color: #64748B; font-size: 12px;">Chandigarh University &ndash; Uttar Pradesh</span>
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Your Certificate is Ready: {{event_title}}

Hi {{name}},

Congratulations! Your official certificate of participation for {{event_title}} has been generated and is now ready for download.

Certificate: Certificate of Participation
Event: {{event_title}}
Issued To: {{studentName}}
Issued By: AWS Student Builder Group • Chandigarh University – Uttar Pradesh

Download Certificate: {{eventUrl}}

Keep building and learning,
The AWS Student Builder Group Team
Chandigarh University – Uttar Pradesh

Please do not reply to this email. This inbox is not monitored.`
  },

  // 10. Feedback Received Acknowledgement (Template 5 in Collage)
  {
    id: 'tpl-feedback_received_acknowledgement',
    name: 'Feedback Received Acknowledgement',
    type: 'feedback_received_acknowledgement',
    category: 'COMMUNITY',
    subject: 'Thank You for Your Feedback!',
    description: 'Dispatched immediately after a student submits feedback on events.',
    variables: ['name', 'studentName'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '💬',
      title: 'Thank You for Your Feedback!',
      subtitle: 'We really appreciate you taking the time to share your thoughts.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Your feedback has been received successfully. It helps us improve and create better experiences for our community.
      </p>

      ${renderCalloutBox({
        type: 'highlight',
        title: 'Your input matters',
        text: 'Together, we can make AWS SBG CU-UP even better.',
        icon: '★'
      })}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Thanks again for being an active member!<br/>
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Thank You for Your Feedback!
We really appreciate you taking the time to share your thoughts.

Dear {{studentName}},

Your feedback has been received successfully. It helps us improve and create better experiences for our community.

Your input matters: Together, we can make AWS SBG CU-UP even better.

Thanks again for being an active member!
AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 11. Email Verification (Template 6 in Collage)
  {
    id: 'tpl-email_verification',
    name: 'Verify Your Email Address',
    type: 'email_verification',
    category: 'COMMUNITY',
    subject: 'Verify Your Email Address – AWS Student Builder Group',
    description: 'Sent to verify email address when creating an account or updating credentials.',
    variables: ['name', 'studentName', 'verification_url', 'verificationUrl', 'expiry_time', 'expiryTime'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '✉️',
      title: 'Verify Your Email Address',
      subtitle: 'Please verify your email to complete your registration.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Click the button below to verify your email address and activate your account.
      </p>

      ${renderCtaButton('Verify Email Address', '{{verification_url}}')}

      <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This link will expire in {{expiry_time}}.<br/>
        If you didn't create an account, you can safely ignore this email.
      </p>
      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 14px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Verify Your Email Address
Please verify your email to complete your registration.

Dear {{studentName}},

Click the link below to verify your email address and activate your account:
{{verification_url}}

This link will expire in {{expiry_time}}.
If you didn't create an account, you can safely ignore this email.

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 12. Password Reset (Template 7 in Collage)
  {
    id: 'tpl-password_reset',
    name: 'Reset Your Password',
    type: 'password_reset',
    category: 'COMMUNITY',
    subject: 'Reset Your Password – AWS Student Builder Group',
    description: 'Sent when a user requests a password reset token.',
    variables: ['name', 'studentName', 'reset_url', 'resetUrl', 'expiry_time', 'expiryTime'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '🔒',
      title: 'Reset Your Password',
      subtitle: 'We received a request to reset your password.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Click the button below to set a new password for your account.
      </p>

      ${renderCtaButton('Reset Password', '{{reset_url}}')}

      <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This link will expire in {{expiry_time}}.<br/>
        If you didn't request a password reset, you can safely ignore this email.
      </p>
      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 14px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Reset Your Password
We received a request to reset your password.

Dear {{studentName}},

Click the link below to set a new password for your account:
{{reset_url}}

This link will expire in {{expiry_time}}.
If you didn't request a password reset, you can safely ignore this email.

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 13. Admin New Event Registration Notification (Template 8 in Collage)
  {
    id: 'tpl-admin_new_event_registration',
    name: 'New Event Registration (Admin Notification)',
    type: 'admin_new_event_registration',
    category: 'ADMIN',
    subject: 'New Registration: {{user_name}} for {{event_title}}',
    description: 'Internal admin notification when a new candidate registers for an event.',
    variables: ['user_name', 'userName', 'user_email', 'userEmail', 'event_title', 'eventTitle', 'registration_date', 'registrationDate', 'admin_url', 'adminUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '👥',
      title: 'New Event Registration',
      subtitle: 'A new user has registered for an event.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      ${renderInfoCard([
        { icon: '👤', label: 'Name', value: '{{user_name}}' },
        { icon: '✉️', label: 'Email', value: '{{user_email}}' },
        { icon: '🎟️', label: 'Event', value: '{{event_title}}' },
        { icon: '⏰', label: 'Registered On', value: '{{registration_date}}' }
      ])}

      ${renderCtaButton('View in Admin Panel', '{{admin_url}}', 'navy')}

      <p style="font-size: 12px; color: #64748B; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This is an automated notification from AWS SBG CU-UP.
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `New Event Registration
A new user has registered for an event.

Name: {{user_name}}
Email: {{user_email}}
Event: {{event_title}}
Registered On: {{registration_date}}

View in Admin Panel: {{admin_url}}

This is an automated notification from AWS SBG CU-UP.

Please do not reply to this email. This inbox is not monitored.`
  },

  // 14. Opportunity Application Received
  {
    id: 'tpl-opportunity_application_received',
    name: 'Opportunity Application Received',
    type: 'opportunity_application_received',
    category: 'OPPORTUNITIES',
    subject: 'Application Received: {{opportunityTitle}}',
    description: 'Dispatched immediately upon submitting an opportunity application.',
    variables: ['name', 'studentName', 'opportunityTitle', 'role', 'applicationId', 'opportunityUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      pillBadge: { text: 'Application Received', icon: '📄', bg: '#0284C7' },
      title: 'Application Received!',
      subtitle: 'We have received your application for {{opportunityTitle}}.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Thank you for applying to the AWS Student Builder Group! Our team has received your application and will review it shortly.
      </p>

      ${renderInfoCard([
        { icon: '💼', label: 'Role / Track', value: '{{opportunityTitle}}' },
        { icon: '🆔', label: 'Application ID', value: '{{applicationId}}', isMonospace: true },
        { icon: '📍', label: 'Team', value: 'Core Operations &amp; Engineering' }
      ])}

      ${renderCtaButton('View Application Track', '{{opportunityUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Best regards,<br/>
        AWS SBG CU-UP Selection Committee
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Application Received: {{opportunityTitle}}

Dear {{studentName}},
Thank you for applying to the AWS Student Builder Group.
Role: {{opportunityTitle}}
Application ID: {{applicationId}}

Track: {{opportunityUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 15. Opportunity Shortlisted
  {
    id: 'tpl-opportunity_shortlisted',
    name: 'Opportunity Shortlisted',
    type: 'opportunity_shortlisted',
    category: 'OPPORTUNITIES',
    subject: 'Application Shortlisted: {{opportunityTitle}}',
    description: 'Sent when candidate is shortlisted for interview/discussion.',
    variables: ['name', 'studentName', 'opportunityTitle', 'nextSteps', 'opportunityUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      pillBadge: { text: 'Shortlisted', icon: '⭐', bg: '#059669' },
      title: 'Congratulations, You Are Shortlisted!',
      subtitle: 'Next steps for your application to {{opportunityTitle}}.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        We are thrilled to let you know that your profile for <strong>{{opportunityTitle}}</strong> stood out and you have been shortlisted for the next interaction round!
      </p>

      ${renderCalloutBox({
        type: 'highlight',
        title: 'Next Steps &amp; Scheduling',
        text: '{{nextSteps}}'
      })}

      ${renderCtaButton('View Opportunity Portal', '{{opportunityUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Best of luck,<br/>
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Congratulations, You Are Shortlisted!
Role: {{opportunityTitle}}

Dear {{studentName}},
You have been shortlisted.
Next Steps: {{nextSteps}}

Portal: {{opportunityUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 16. Opportunity Selected
  {
    id: 'tpl-opportunity_selected',
    name: 'Opportunity Selected',
    type: 'opportunity_selected',
    category: 'OPPORTUNITIES',
    subject: 'Official Offer: Welcome to the Team! ({{opportunityTitle}})',
    description: 'Sent when candidate is selected for AWS SBG Core Team.',
    variables: ['name', 'studentName', 'opportunityTitle', 'onboardingNotes', 'opportunityUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '🎉',
      title: 'Welcome to the Team!',
      subtitle: 'Official selection offer for {{opportunityTitle}}.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Congratulations! On behalf of the AWS Student Builder Group leadership, we are excited to officially welcome you as part of our team for <strong>{{opportunityTitle}}</strong>!
      </p>

      ${renderCalloutBox({
        type: 'highlight',
        title: 'Onboarding Instructions',
        text: '{{onboardingNotes}}'
      })}

      ${renderCtaButton('Access Member Portal', '{{opportunityUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Welcome aboard!<br/>
        AWS SBG CU-UP Leadership
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Official Selection Offer: {{opportunityTitle}}

Dear {{studentName}},
Welcome to the AWS Student Builder Group team!
Onboarding: {{onboardingNotes}}

Portal: {{opportunityUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 17. Opportunity Rejected
  {
    id: 'tpl-opportunity_rejected',
    name: 'Opportunity Application Regret',
    type: 'opportunity_rejected',
    category: 'OPPORTUNITIES',
    subject: 'Update Regarding Your Application: {{opportunityTitle}}',
    description: 'Polite notice dispatched if candidate is not selected.',
    variables: ['name', 'studentName', 'opportunityTitle', 'opportunityUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '📋',
      title: 'Application Update',
      subtitle: 'Update regarding your application for {{opportunityTitle}}.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Thank you for taking the time to apply for <strong>{{opportunityTitle}}</strong>. We received an overwhelming number of strong applications and after careful consideration, we are unable to offer you a position at this time.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        We encourage you to remain active in our community events and apply for future cohorts.
      </p>

      ${renderCtaButton('Explore Community Events', '{{opportunityUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Warm regards,<br/>
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Update Regarding Your Application: {{opportunityTitle}}

Dear {{studentName}},
Thank you for applying. We are unable to offer you a position at this time. We encourage you to participate in community sessions.

Community: {{opportunityUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 18. Exam Instructions
  {
    id: 'tpl-exam_instructions',
    name: 'Your Secure Examination Credentials',
    type: 'exam_instructions',
    category: 'EXAMS',
    subject: 'Exam Credentials: {{examName}}',
    description: 'Dispatched to verified candidates with Exam Code and Access Password.',
    variables: ['name', 'studentName', 'examName', 'examCode', 'examPassword', 'durationMinutes', 'examUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '🔐',
      title: 'Your Examination Credentials',
      subtitle: 'Secure assessment access instructions for {{examName}}.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Your examination credentials for <strong>{{examName}}</strong> are ready. Keep this information confidential.
      </p>

      ${renderInfoCard([
        { icon: '📝', label: 'Assessment', value: '{{examName}}' },
        { icon: '🔑', label: 'Exam Code', value: '{{examCode}}', isMonospace: true },
        { icon: '🔒', label: 'Access Password', value: '{{examPassword}}', isMonospace: true },
        { icon: '⏱️', label: 'Duration', value: '{{durationMinutes}} Minutes' }
      ])}

      ${renderCtaButton('Enter Exam Portal', '{{examUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Best of luck!<br/>
        AWS SBG CU-UP Examination Board
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Your Examination Credentials: {{examName}}

Dear {{studentName}},
Exam Code: {{examCode}}
Password: {{examPassword}}
Duration: {{durationMinutes}} Minutes

Access: {{examUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 19. Exam Reminder
  {
    id: 'tpl-exam_reminder',
    name: 'Exam Schedule Reminder',
    type: 'exam_reminder',
    category: 'EXAMS',
    subject: 'Reminder: Upcoming Assessment – {{examName}}',
    description: 'Scheduled broadcast before assessment start.',
    variables: ['name', 'studentName', 'examName', 'durationMinutes', 'examUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      pillBadge: { text: 'Upcoming Exam', icon: '⏰' },
      title: 'Examination Reminder',
      subtitle: 'Your scheduled session for {{examName}} is coming up.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This is a friendly reminder to prepare for your scheduled assessment: <strong>{{examName}}</strong>. Ensure a stable internet connection and quiet environment.
      </p>

      ${renderCtaButton('Access Assessment Lobby', '{{examUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Examination Board
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Reminder: Upcoming Assessment – {{examName}}

Dear {{studentName}},
Please be ready for {{examName}}.
Access: {{examUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 20. Exam Submission Confirmation
  {
    id: 'tpl-exam_submitted_confirmation',
    name: 'Exam Submission Confirmation',
    type: 'exam_submitted_confirmation',
    category: 'EXAMS',
    subject: 'Exam Submitted: {{examName}}',
    description: 'Official receipt confirming exam submission without score leakage.',
    variables: ['name', 'studentName', 'examName', 'submittedAt'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '✅',
      title: 'Exam Submitted Successfully',
      subtitle: 'Official submission receipt for {{examName}}.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Your submission for <strong>{{examName}}</strong> has been securely received and recorded by the examination server.
      </p>

      ${renderCalloutBox({
        type: 'info',
        title: 'Submission Acknowledged',
        text: 'Your responses have been archived. Official evaluated scorecards will be released after proctor verification.'
      })}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Examination Board
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Exam Submitted Successfully: {{examName}}

Dear {{studentName}},
Your submission has been securely recorded.
Evaluated scorecards will be published following proctor review.

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 21. Exam Result Scorecard
  {
    id: 'tpl-exam_result',
    name: 'Official Exam Result Scorecard',
    type: 'exam_result',
    category: 'EXAMS',
    subject: 'Official Assessment Result: {{examName}}',
    description: 'Direct candidate scorecard email containing score, percentage, and verdict.',
    variables: ['name', 'studentName', 'examName', 'score', 'totalMarks', 'percentage', 'verdict', 'verdictColor'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '📊',
      title: 'Official Exam Scorecard',
      subtitle: 'Performance result for {{examName}}.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Your evaluation for <strong>{{examName}}</strong> is complete. Here is your official assessment scorecard:
      </p>

      ${renderInfoCard([
        { icon: '📝', label: 'Assessment', value: '{{examName}}' },
        { icon: '🎯', label: 'Score Earned', value: '{{score}} / {{totalMarks}}' },
        { icon: '📈', label: 'Percentage', value: '{{percentage}}%' },
        { icon: '⚖️', label: 'Final Verdict', value: '{{verdict}}', isMonospace: true }
      ])}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Examination Board
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Official Exam Scorecard: {{examName}}

Dear {{studentName}},
Score: {{score}} / {{totalMarks}}
Percentage: {{percentage}}%
Verdict: {{verdict}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 22. Exam Selected / Qualified Notice
  {
    id: 'tpl-exam_selected_qualified',
    name: 'Candidate Qualification Notice',
    type: 'exam_selected_qualified',
    category: 'EXAMS',
    subject: 'Congratulations! Selected & Qualified in {{examName}}',
    description: 'Dispatched when candidate qualifies from proctor console.',
    variables: ['name', 'studentName', 'examName', 'selectionNotes'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '🎖️',
      title: 'Congratulations, You Qualified!',
      subtitle: 'Official qualification notification for {{examName}}.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Congratulations! You have met all competency benchmarks and successfully qualified in <strong>{{examName}}</strong>!
      </p>

      ${renderCalloutBox({
        type: 'highlight',
        title: 'Proctor Evaluation Notes',
        text: '{{selectionNotes}}'
      })}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Examination Board
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Congratulations, You Qualified in {{examName}}!

Dear {{studentName}},
You met the required benchmarks and qualified.
Notes: {{selectionNotes}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 23. Digital ID Card Delivery
  {
    id: 'tpl-digital_id_card_delivery',
    name: 'Official Digital ID Card Delivery',
    type: 'digital_id_card_delivery',
    category: 'IDENTITY',
    subject: 'Your Official Digital ID: {{publicId}} – AWS Student Builder Group',
    description: 'Dispatched with PDF card attachment when an official digital ID is generated.',
    variables: ['name', 'studentName', 'publicId', 'memberRole', 'memberDomain', 'cardUrl', 'verificationUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '🪪',
      title: 'Official Digital ID Delivery',
      subtitle: 'Your official credential ID {{publicId}} is active.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Your official Digital ID Card has been provisioned and verified in our community registry.
      </p>

      ${renderInfoCard([
        { icon: '🆔', label: 'Digital ID', value: '{{publicId}}', isMonospace: true },
        { icon: '💼', label: 'Role', value: '{{memberRole}}' },
        { icon: '🌐', label: 'Domain', value: '{{memberDomain}}' },
        { icon: '✓', label: 'Registry Status', value: 'Active &amp; Verified' }
      ])}

      ${renderCtaButton('View Digital ID Card', '{{cardUrl}}')}

      ${renderCalloutBox({
        type: 'alert',
        title: 'Digital ID Card PDF Attached',
        text: 'Your official high-resolution, dual-sided Digital ID Card PDF with scannable QR verification code is attached to this email for your records and printing.',
        icon: '📄'
      })}

      <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Your high-resolution PDF credential card is attached to this email. You can verify this ID anytime at <a href="{{verificationUrl}}" style="color: #FF9900; text-decoration: none;">{{verificationUrl}}</a>.
      </p>
      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 14px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Registry
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Your Official Digital ID: {{publicId}}

Dear {{studentName}},
Your Digital ID {{publicId}} is active and verified.
Role: {{memberRole}}
Domain: {{memberDomain}}

View Card: {{cardUrl}}
Verify: {{verificationUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 24. Digital Badge Delivery
  {
    id: 'tpl-digital_badge_delivery',
    name: 'Official Digital Badge Delivery',
    type: 'digital_badge_delivery',
    category: 'IDENTITY',
    subject: "Congratulations! You've Earned the {{badgeTitle}} Badge",
    description: 'Dispatched when an official verifiable digital credential badge is awarded.',
    variables: ['name', 'studentName', 'badgeTitle', 'badgeUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '🏅',
      title: 'Digital Credential Awarded!',
      subtitle: "Congratulations on earning the {{badgeTitle}} badge."
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        You have successfully demonstrated technical competency and earned the official <strong>{{badgeTitle}}</strong> digital badge!
      </p>

      ${renderCtaButton('View Digital Badge', '{{badgeUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Credentials
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Congratulations! You've Earned the {{badgeTitle}} Badge

Dear {{studentName}},
You have earned the official {{badgeTitle}} badge from AWS Student Builder Group.
View Badge: {{badgeUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 25. Founding Members Announcement
  {
    id: 'tpl-founding_members_announcement',
    name: 'Founding Members Announcement',
    type: 'founding_members_announcement',
    category: 'TEAM',
    subject: 'Official Announcement: AWS Student Builder Group Leadership & Founding Team',
    description: 'Exclusive communication for founding cohort members.',
    variables: ['memberName', 'memberRole', 'memberDomain', 'announcementTitle', 'messageContent'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '📢',
      title: 'Founding Team Announcement',
      subtitle: 'Exclusive update for AWS SBG CU-UP founding members.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{memberName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        {{announcementText}}
      </div>

      ${renderCtaButton('Access Member Portal', '{{eventUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Lead &middot; Build &middot; Inspire,<br/>
        AWS SBG CU-UP Leadership
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Founding Team Announcement

Dear {{memberName}},
{{announcementText}}

Portal: {{eventUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 26. Founding Members Meeting
  {
    id: 'tpl-founding_members_meeting',
    name: 'Founding Members Meeting Invitation',
    type: 'founding_members_meeting',
    category: 'TEAM',
    subject: 'Core Team Sync: {{meetingAgenda}}',
    description: 'Meeting invitation and sync details for founding team.',
    variables: ['name', 'studentName', 'event_title', 'eventTitle', 'event_date', 'eventDate', 'event_time', 'eventTime', 'event_url', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '🗓️',
      title: 'Strategy &amp; Planning Meeting',
      subtitle: 'Sync session for AWS SBG CU-UP founding members.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        You are invited to the upcoming strategy and planning sync for the founding team.
      </p>

      ${renderInfoCard([
        { icon: '📌', label: 'Agenda', value: '{{event_title}}' },
        { icon: '📅', label: 'Date', value: '{{event_date}}' },
        { icon: '⏰', label: 'Time', value: '{{event_time}}' }
      ])}

      ${renderCtaButton('Join Meeting Room', '{{event_url}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Leadership
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Founding Members Meeting

Dear {{studentName}},
Agenda: {{event_title}}
Date: {{event_date}}
Time: {{event_time}}

Join: {{event_url}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 27. Founding Members Coordination
  {
    id: 'tpl-founding_members_coordination',
    name: 'Founding Members Event Coordination',
    type: 'founding_members_coordination',
    category: 'TEAM',
    subject: 'Event Execution & Coordination: {{event_title}}',
    description: 'Operational coordination briefing for event leads.',
    variables: ['name', 'studentName', 'event_title', 'eventTitle', 'coordinationNotes', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '⚡',
      title: 'Event Coordination Briefing',
      subtitle: 'Operational briefing for {{event_title}}.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Here are the operational assignments and logistics briefing for <strong>{{event_title}}</strong>.
      </p>

      ${renderCalloutBox({
        type: 'info',
        title: 'Coordination Notes',
        text: '{{coordinationNotes}}'
      })}

      ${renderCtaButton('View Coordination Sheet', '{{eventUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Operations
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Event Coordination: {{event_title}}

Dear {{studentName}},
Notes: {{coordinationNotes}}

Briefing: {{eventUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 28. Founding Members Recognition
  {
    id: 'tpl-founding_members_recognition',
    name: 'Founding Member Recognition & Appreciation',
    type: 'founding_members_recognition',
    category: 'TEAM',
    subject: 'Recognition & Appreciation – AWS Student Builder Group',
    description: 'Appreciation letter for core contributors.',
    variables: ['name', 'studentName', 'recognitionDetails'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '🌟',
      title: 'Recognition &amp; Appreciation',
      subtitle: 'Celebrating your impactful leadership and contributions.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Thank you for your outstanding dedication and leadership in shaping the AWS Student Builder Group at Chandigarh University &ndash; Uttar Pradesh.
      </p>

      ${renderCalloutBox({
        type: 'highlight',
        title: 'Special Recognition',
        text: '{{recognitionDetails}}',
        icon: '🎖️'
      })}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        With gratitude,<br/>
        AWS SBG CU-UP Executive Board
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Recognition & Appreciation

Dear {{studentName}},
Thank you for your exceptional dedication to our community.
{{recognitionDetails}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 29. Founding Members Internal Update
  {
    id: 'tpl-founding_members_update',
    name: 'Founding Members Internal Update',
    type: 'founding_members_update',
    category: 'TEAM',
    subject: 'Internal Leadership Update: {{updateSubject}}',
    description: 'Internal progress updates for founding members.',
    variables: ['name', 'studentName', 'updateNotes', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '📌',
      title: 'Internal Community Update',
      subtitle: 'Progress update for AWS SBG CU-UP founding members.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        {{updateNotes}}
      </div>

      ${renderCtaButton('View Details', '{{eventUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Leadership
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Internal Update

Dear {{studentName}},
{{updateNotes}}

Details: {{eventUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 30. Admin Custom Announcement Broadcast
  {
    id: 'tpl-admin_custom_announcement',
    name: 'Official Announcement Broadcast',
    type: 'admin_custom_announcement',
    category: 'ADMIN',
    subject: 'Official Announcement: {{announcementTitle}}',
    description: 'Custom announcement broadcast sent to all registered community members.',
    variables: ['name', 'studentName', 'title', 'messageContent', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '📢',
      title: 'Official Announcement',
      subtitle: '{{title}}'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        {{messageContent}}
      </div>

      ${renderCtaButton('Visit Community Portal', '{{eventUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Official Announcement: {{title}}

Dear {{studentName}},
{{messageContent}}

Portal: {{eventUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 31. Admin Manual Communication
  {
    id: 'tpl-admin_manual_message',
    name: 'Admin Manual Communication',
    type: 'admin_manual_message',
    category: 'ADMIN',
    subject: '{{subject}}',
    description: 'Direct communication sent manually by administrators.',
    variables: ['name', 'studentName', 'messageContent', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '💬',
      title: 'Message from AWS SBG CU-UP',
      subtitle: 'Official communication from student chapter administration.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        {{messageContent}}
      </div>

      ${renderCtaButton('Open Community Website', '{{eventUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Administration
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `Message from AWS Student Builder Group

Dear {{studentName}},
{{messageContent}}

Website: {{eventUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  },

  // 32. System Test Email
  {
    id: 'tpl-system_test_email',
    name: 'System Test Email',
    type: 'system_test_email',
    category: 'ADMIN',
    subject: 'System Test: AWS SBG CU-UP Email Infrastructure',
    description: 'Triggered during diagnostic testing to verify email delivery.',
    variables: ['name', 'studentName', 'eventUrl'],
    isActive: true,
    updatedAt: new Date().toISOString(),
    bodyHtml: `${renderHeroBanner({
      iconBadge: '🛠️',
      title: 'System Test Notification',
      subtitle: 'Automated diagnostic check of AWS SBG CU-UP email infrastructure.'
    })}
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 24px;">
  <tr>
    <td>
      <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Dear {{studentName}},
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        This is an official verification check confirming that your email recipient channel and our centralized email delivery pipeline are operating with 100% fidelity.
      </p>

      ${renderInfoCard([
        { icon: '📡', label: 'Delivery Service', value: 'Resend API (Active &amp; Operational)' },
        { icon: '🏛️', label: 'Organization', value: 'AWS Student Builder Group (CU-UP)' },
        { icon: '🔒', label: 'Verification', value: 'Encrypted TLS Transmission' }
      ])}

      ${renderCtaButton('Visit Community Portal', '{{eventUrl}}')}

      <p style="font-size: 13px; color: #0F172A; font-weight: 700; margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        AWS SBG CU-UP Infrastructure Team
      </p>
    </td>
  </tr>
</table>`,
    bodyText: `System Test Notification
Automated diagnostic check of AWS SBG CU-UP email infrastructure.

Dear {{studentName}},
This confirms that the email delivery pipeline is operational.

Portal: {{eventUrl}}

AWS SBG CU-UP Team

Please do not reply to this email. This inbox is not monitored.`
  }
];
