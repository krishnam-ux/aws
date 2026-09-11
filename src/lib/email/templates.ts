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
 * Matches official reference design: Dark Header + Dark Ambient Hero + Light Card Body + Dark Branded Footer.
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
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
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
    body { margin: 0; padding: 0; width: 100% !important; background-color: #060911; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .email-container { max-width: 640px; margin: 0 auto; background-color: #0B0F17; border-radius: 16px; overflow: hidden; border: 1px solid #1E293B; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); }
    .preheader { display: none !important; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #060911; }
    
    /* Responsive styling */
    @media screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .mobile-p-16 { padding: 16px !important; }
      .mobile-p-20 { padding: 20px 16px !important; }
      .mobile-hide { display: none !important; }
      .mobile-center { text-align: center !important; }
      .mobile-w-full { width: 100% !important; max-width: 100% !important; }
      .hero-title-mobile { font-size: 26px !important; line-height: 1.25 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #060911;">
  ${preheader ? `<div class="preheader">${escapeHtml(preheader)}</div>` : ''}

  <!-- Outer Full Width Background -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#060911" style="background-color: #060911; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 8px 36px 8px;">
        <!-- Center Email Container -->
        <table class="email-container" width="640" border="0" cellspacing="0" cellpadding="0" bgcolor="#0B0F17" style="max-width: 640px; width: 100%; background-color: #0B0F17; border-radius: 16px; overflow: hidden; border: 1px solid #1E293B;">
          
          <!-- 1. TOP BRANDED HEADER BAR -->
          <tr>
            <td bgcolor="#0B0F17" style="background-color: #0B0F17; padding: 18px 24px; border-bottom: 1px solid #1E293B;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Left: Chandigarh University Logo -->
                  <td align="left" valign="middle" style="width: 120px;">
                    <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: block;">
                      <img src="${siteUrl}/chandigarh-university-logo.jpg" alt="Chandigarh University" width="115" height="38" style="display: block; height: 38px; width: auto; max-width: 115px; border-radius: 4px; object-fit: contain;" />
                    </a>
                  </td>

                  <!-- Center: Brand Name & Subtext -->
                  <td align="center" valign="middle" style="padding: 0 10px;">
                    <div style="font-size: 15px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.2px; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      AWS <span style="color: #FF9900;">Student Builder Group</span>
                    </div>
                    <div style="font-size: 9px; font-weight: 700; color: #94A3B8; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      CHANDIGARH UNIVERSITY – UTTAR PRADESH
                    </div>
                  </td>

                  <!-- Right: AWS Mark -->
                  <td align="right" valign="middle" style="width: 70px;">
                    <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${siteUrl}/aws-logo.svg" alt="AWS" width="46" height="26" style="display: block; height: 26px; width: auto; max-width: 46px;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 2. MAIN TEMPLATE CONTENT (Hero + Light Card Body) -->
          <tr>
            <td bgcolor="#0B0F17" style="background-color: #0B0F17; padding: 0;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Optional CTA Button injected if ctaText & ctaUrl are provided outside template content -->
          ${
            ctaText && ctaUrl && !contentHtml.includes('btn-cta-primary')
              ? `<tr>
                  <td bgcolor="#F1F5F9" align="center" style="background-color: #F1F5F9; padding: 8px 24px 28px 24px;">
                    <a href="${escapeHtml(ctaUrl)}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 14px 36px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
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
                  <td bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 0 24px 20px 24px; font-size: 12px; color: #64748B; text-align: center;">
                    ${footerNotes}
                  </td>
                </tr>`
              : ''
          }

          <!-- 3. PREMIUM DARK FOOTER -->
          <tr>
            <td bgcolor="#0B0F17" style="background-color: #0B0F17; padding: 28px 24px; border-top: 1px solid #1E293B;">
              <!-- Footer Top Section -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="top" class="mobile-stack" style="padding-bottom: 12px;">
                    <div style="font-size: 13px; font-weight: 800; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      AWS Student Builder Group
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #94A3B8; margin-top: 2px;">
                      Chandigarh University – Uttar Pradesh
                    </div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 4px; max-width: 320px; line-height: 1.4;">
                      A student-led cloud computing &amp; emerging technology learning community.
                    </div>
                  </td>

                  <!-- Footer Social / Tagline -->
                  <td align="right" valign="top" class="mobile-stack" style="padding-bottom: 12px;">
                    <!-- Social Circle Icons -->
                    <table border="0" cellspacing="0" cellpadding="0" style="display: inline-table;">
                      <tr>
                        <td style="padding-left: 6px;">
                          <a href="https://www.linkedin.com/company/aws-sbg-cu/" target="_blank" style="display: inline-block; width: 28px; height: 28px; line-height: 28px; border-radius: 50%; background-color: #1E293B; color: #FFFFFF; text-align: center; text-decoration: none; font-size: 11px; font-weight: bold; border: 1px solid #334155;">in</a>
                        </td>
                        <td style="padding-left: 6px;">
                          <a href="https://www.instagram.com/awssbgcu/" target="_blank" style="display: inline-block; width: 28px; height: 28px; line-height: 28px; border-radius: 50%; background-color: #1E293B; color: #FFFFFF; text-align: center; text-decoration: none; font-size: 11px; font-weight: bold; border: 1px solid #334155;">ig</a>
                        </td>
                        <td style="padding-left: 6px;">
                          <a href="https://www.youtube.com/@awssbgcu" target="_blank" style="display: inline-block; width: 28px; height: 28px; line-height: 28px; border-radius: 50%; background-color: #1E293B; color: #FFFFFF; text-align: center; text-decoration: none; font-size: 11px; font-weight: bold; border: 1px solid #334155;">yt</a>
                        </td>
                        <td style="padding-left: 6px;">
                          <a href="${siteUrl}" target="_blank" style="display: inline-block; width: 28px; height: 28px; line-height: 28px; border-radius: 50%; background-color: #1E293B; color: #FF9900; text-align: center; text-decoration: none; font-size: 12px; font-weight: bold; border: 1px solid #334155;">🌐</a>
                        </td>
                      </tr>
                    </table>
                    <div style="font-size: 11px; color: #94A3B8; margin-top: 8px; font-weight: 600;">
                      Build a Better Tomorrow with Cloud.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Footer Navigation Links -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 16px; border-top: 1px solid #1E293B; padding-top: 14px;">
                <tr>
                  <td align="center" style="font-size: 11px; color: #94A3B8; line-height: 1.8;">
                    <a href="${siteUrl}" target="_blank" style="color: #94A3B8; text-decoration: none; font-weight: 600;">Home</a> &nbsp;|&nbsp;
                    <a href="${siteUrl}/events" target="_blank" style="color: #94A3B8; text-decoration: none; font-weight: 600;">Events</a> &nbsp;|&nbsp;
                    <a href="${siteUrl}/opportunities" target="_blank" style="color: #94A3B8; text-decoration: none; font-weight: 600;">Opportunities</a> &nbsp;|&nbsp;
                    <a href="${siteUrl}/resources" target="_blank" style="color: #94A3B8; text-decoration: none; font-weight: 600;">Resources</a> &nbsp;|&nbsp;
                    <a href="${siteUrl}/leadership" target="_blank" style="color: #94A3B8; text-decoration: none; font-weight: 600;">Team</a> &nbsp;|&nbsp;
                    <a href="${siteUrl}/contact" target="_blank" style="color: #94A3B8; text-decoration: none; font-weight: 600;">Contact</a>
                  </td>
                </tr>
              </table>

              <!-- Footer Copyright & Motto -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px;">
                <tr>
                  <td align="left" class="mobile-stack mobile-center" style="font-size: 10px; color: #64748B;">
                    &copy; ${currentYear} AWS SBG CU-UP. All rights reserved.
                  </td>
                  <td align="right" class="mobile-stack mobile-center" style="font-size: 10px; color: #64748B; padding-top: 4px;">
                    Learn &nbsp;|&nbsp; Build &nbsp;|&nbsp; Grow &nbsp;|&nbsp; Together
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
 * Helper: Generates a responsive metadata row with rounded orange icon badge
 */
function renderMetaRow(icon: string, label: string, value: string, isMonospace: boolean = false): string {
  return `<tr>
    <td width="36" valign="middle" style="width: 36px; padding: 6px 0;">
      <div style="width: 32px; height: 32px; background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 50%; text-align: center; line-height: 32px; font-size: 15px;">${icon}</div>
    </td>
    <td valign="middle" style="padding: 6px 0 6px 10px;">
      <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
      <div style="font-size: 14px; font-weight: 700; color: #0F172A; ${isMonospace ? 'font-family: SFMono-Regular, Consolas, monospace; color: #FF9900;' : ''}">${value}</div>
    </td>
  </tr>`;
}

/**
 * Helper: Generates a 3-column action cards section
 */
function renderActionCards(params: {
  card1Title: string;
  card1Desc: string;
  card1LinkText: string;
  card1Url: string;
  card1Icon: string;
  card2Title: string;
  card2Desc: string;
  card2LinkText: string;
  card2Url: string;
  card2Icon: string;
  card3Title: string;
  card3Desc: string;
  card3LinkText: string;
  card3Url: string;
  card3Icon: string;
}): string {
  return `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px; margin-bottom: 24px;">
  <tr>
    <td width="32%" valign="top" class="mobile-stack" style="padding: 0 4px 10px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
        <tr>
          <td align="center">
            <div style="font-size: 20px; margin-bottom: 8px;">${params.card1Icon}</div>
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">${params.card1Title}</div>
            <div style="font-size: 11px; color: #64748B; line-height: 1.4; margin-bottom: 10px;">${params.card1Desc}</div>
            <a href="${params.card1Url}" target="_blank" style="font-size: 12px; font-weight: 800; color: #EA580C; text-decoration: none;">${params.card1LinkText} &rarr;</a>
          </td>
        </tr>
      </table>
    </td>
    <td width="32%" valign="top" class="mobile-stack" style="padding: 0 2px 10px 2px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
        <tr>
          <td align="center">
            <div style="font-size: 20px; margin-bottom: 8px;">${params.card2Icon}</div>
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">${params.card2Title}</div>
            <div style="font-size: 11px; color: #64748B; line-height: 1.4; margin-bottom: 10px;">${params.card2Desc}</div>
            <a href="${params.card2Url}" target="_blank" style="font-size: 12px; font-weight: 800; color: #EA580C; text-decoration: none;">${params.card2LinkText} &rarr;</a>
          </td>
        </tr>
      </table>
    </td>
    <td width="32%" valign="top" class="mobile-stack" style="padding: 0 0 10px 4px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
        <tr>
          <td align="center">
            <div style="font-size: 20px; margin-bottom: 8px;">${params.card3Icon}</div>
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">${params.card3Title}</div>
            <div style="font-size: 11px; color: #64748B; line-height: 1.4; margin-bottom: 10px;">${params.card3Desc}</div>
            <a href="${params.card3Url}" target="_blank" style="font-size: 12px; font-weight: 800; color: #EA580C; text-decoration: none;">${params.card3LinkText} &rarr;</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Official Built-in Email Templates for AWS SBG CU-UP
 * Redesigned to match the high-end reference layout.
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
    bodyHtml: `<!-- HERO SECTION (Dark Ambient) -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top" class="mobile-stack">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        EVENT REGISTRATION CONFIRMED
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        You're <span style="color: #FF9900;">All Set!</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 460px;">
        Congratulations! Your registration for <strong>{{eventTitle}}</strong> has been successfully confirmed. We're excited to have you with us!
      </div>
    </td>
    <td align="right" valign="top" class="mobile-hide" style="width: 130px; padding-left: 16px;">
      <div style="background: rgba(255, 153, 0, 0.08); border: 1px solid rgba(255, 153, 0, 0.25); border-radius: 12px; padding: 14px 10px; text-align: center;">
        <div style="font-size: 18px; color: #FF9900; font-weight: 900; line-height: 1.1; font-family: Georgia, serif; font-style: italic;">Build</div>
        <div style="font-size: 18px; color: #FFFFFF; font-weight: 900; line-height: 1.1; font-family: Georgia, serif; font-style: italic;">Learn</div>
        <div style="font-size: 18px; color: #FF9900; font-weight: 900; line-height: 1.1; font-family: Georgia, serif; font-style: italic;">Grow</div>
        <div style="font-size: 9px; color: #94A3B8; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px;">Together</div>
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- PRIMARY EVENT DETAILS CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">
              {{eventTitle}}
            </div>
            <div style="font-size: 13px; color: #64748B; line-height: 1.5; margin-bottom: 18px;">
              Kickstart your cloud journey with AWS at Chandigarh University &ndash; UP. An interactive session with hands-on learning, expert guidance, and more!
            </div>
            
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #F1F5F9; padding-top: 12px;">
              ${renderMetaRow('📅', 'Date', '{{eventDate}}')}
              ${renderMetaRow('⏰', 'Time', '{{eventTime}}')}
              ${renderMetaRow('📍', 'Venue', '{{eventVenue}}')}
              ${renderMetaRow('👥', 'Mode', '{{eventMode}}')}
              ${renderMetaRow('🎫', 'Registration ID', '{{registrationId}}', true)}
            </table>
          </td>
        </tr>
      </table>

      <!-- HIGHLIGHTED CHECK-IN CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFF7ED" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #FFEDD5; border: 1px solid #FDBA74; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">🪪</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #9A3412; margin-bottom: 3px;">
              Important for Check-in
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.5;">
              Please arrive at least 10 minutes before the session start time. Bring your Student ID card for verification.
            </div>
          </td>
        </tr>
      </table>

      <!-- 3-CARD HELPER SECTION -->
      ${renderActionCards({
        card1Icon: '📅',
        card1Title: 'Add to Calendar',
        card1Desc: "Don't miss it! Save the event to your schedule.",
        card1LinkText: 'Add to Calendar',
        card1Url: '{{eventUrl}}',
        card2Icon: '📄',
        card2Title: 'Event Details',
        card2Desc: 'View complete agenda, speaker notes and track.',
        card2LinkText: 'View Details',
        card2Url: '{{eventUrl}}',
        card3Icon: '❓',
        card3Title: 'Need Help?',
        card3Desc: "Facing any issues? We're here to assist you.",
        card3LinkText: 'Contact Support',
        card3Url: 'https://www.awssbgcuup.tech/contact'
      })}

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="{{eventUrl}}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              View Event Details &rarr;
            </a>
          </td>
        </tr>
      </table>

      <!-- WARM CLOSING -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 16px;">
        <tr>
          <td align="center">
            <div style="font-size: 14px; font-weight: 700; color: #0F172A;">
              We look forward to seeing you there!
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #64748B; margin-top: 3px;">
              Team AWS SBG CU-UP
            </div>
            <div style="width: 36px; height: 3px; background-color: #FF9900; border-radius: 2px; margin: 10px auto 0 auto;"></div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Congratulations! Your registration for "{{eventTitle}}" has been successfully confirmed.

Event Details:
- Date: {{eventDate}}
- Time: {{eventTime}}
- Venue: {{eventVenue}}
- Mode: {{eventMode}}
- Registration ID: {{registrationId}}

Important for Check-in:
Please arrive at least 10 minutes before the session start time. Bring your Student ID card for verification.

View Event Details: {{eventUrl}}

We look forward to seeing you there!
Team AWS SBG CU-UP`
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        EVENT 24-HOUR REMINDER
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Starting <span style="color: #FF9900;">Tomorrow!</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        This is a friendly reminder that <strong>{{eventTitle}}</strong> takes place tomorrow! Make sure you are prepared for an insightful session.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- PRIMARY EVENT DETAILS CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 14px;">
              {{eventTitle}}
            </div>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              ${renderMetaRow('📅', 'Date', '{{eventDate}}')}
              ${renderMetaRow('⏰', 'Time', '{{eventTime}}')}
              ${renderMetaRow('📍', 'Venue', '{{eventVenue}}')}
            </table>
          </td>
        </tr>
      </table>

      <!-- HIGHLIGHTED PREPARATION CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFF7ED" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #FFEDD5; border: 1px solid #FDBA74; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">💻</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #9A3412; margin-bottom: 3px;">
              Preparation Checklist
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.5;">
              Ensure your laptop is fully charged for hands-on architectural labs. Arrive 15 minutes before the start time for smooth check-in.
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="{{eventUrl}}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              View Event Information &rarr;
            </a>
          </td>
        </tr>
      </table>

      <!-- CLOSING -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 16px;">
        <tr>
          <td align="center">
            <div style="font-size: 14px; font-weight: 700; color: #0F172A;">See you tomorrow!</div>
            <div style="font-size: 12px; font-weight: 600; color: #64748B; margin-top: 3px;">AWS SBG CU-UP Events Desk</div>
            <div style="width: 36px; height: 3px; background-color: #FF9900; border-radius: 2px; margin: 10px auto 0 auto;"></div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Reminder: "{{eventTitle}}" takes place tomorrow on {{eventDate}} at {{eventTime}} at {{eventVenue}}.

Ensure your laptop is charged and arrive 15 minutes early.

Event details: {{eventUrl}}

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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        URGENT EVENT REMINDER
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Starting in <span style="color: #FF9900;">1 Hour!</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        <strong>{{eventTitle}}</strong> begins in just 60 minutes! Check-in gates are now open.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- PRIMARY DETAILS CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 14px;">
              {{eventTitle}}
            </div>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              ${renderMetaRow('⏰', 'Start Time', '{{eventTime}}')}
              ${renderMetaRow('📍', 'Venue', '{{eventVenue}}')}
            </table>
          </td>
        </tr>
      </table>

      <!-- GATES OPEN CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFF7ED" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #FFEDD5; border: 1px solid #FDBA74; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">🚀</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #9A3412; margin-bottom: 3px;">
              Gates Are Now Open
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.5;">
              Registration desks are active. Please proceed to the venue with your Student ID card.
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="{{eventUrl}}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Get Directions &amp; Details &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

"{{eventTitle}}" starts in 1 hour at {{eventTime}} (Venue: {{eventVenue}}).

Check-in gates are now open.

Details: {{eventUrl}}

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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        EVENT SCHEDULE UPDATE
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Schedule <span style="color: #FF9900;">Updated</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Please note an important schedule or venue update regarding <strong>{{eventTitle}}</strong>. Your registration remains active.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- PRIMARY DETAILS CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 14px;">
              Updated Session Details
            </div>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              ${renderMetaRow('📅', 'New Date', '{{eventDate}}')}
              ${renderMetaRow('⏰', 'New Time', '{{eventTime}}')}
              ${renderMetaRow('📍', 'Venue', '{{eventVenue}}')}
            </table>
          </td>
        </tr>
      </table>

      <!-- UPDATE NOTES CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFF7ED" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #FFEDD5; border: 1px solid #FDBA74; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">ℹ️</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #9A3412; margin-bottom: 3px;">
              Update Notes
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.5;">
              {{updateNotes}}
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="{{eventUrl}}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Review Updated Schedule &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Update regarding "{{eventTitle}}":
New Date: {{eventDate}}
New Time: {{eventTime}}
Venue: {{eventVenue}}
Notes: {{updateNotes}}

Your registration remains active.
View details: {{eventUrl}}

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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #F87171; text-transform: uppercase; margin-bottom: 8px;">
        EVENT CANCELLATION NOTICE
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Event <span style="color: #F87171;">Cancelled</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        We regret to inform you that <strong>{{eventTitle}}</strong> has been cancelled due to unforeseen scheduling constraints.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- REASON CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FEF2F2" style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">⚠️</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #991B1B; margin-bottom: 3px;">
              Reason for Cancellation
            </div>
            <div style="font-size: 13px; color: #374151; line-height: 1.5;">
              {{cancellationReason}}
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="https://www.awssbgcuup.tech/events" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Browse Upcoming Events &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

We regret to inform you that "{{eventTitle}}" has been cancelled.
Reason: {{cancellationReason}}

Browse upcoming events at: https://www.awssbgcuup.tech/events

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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        APPLICATION RECEIVED
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Application <span style="color: #FF9900;">Received!</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Thank you for applying for <strong>{{opportunityTitle}}</strong> with the AWS Student Builder Group at Chandigarh University &ndash; Uttar Pradesh.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- DETAILS CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 14px;">
              Application Summary
            </div>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              ${renderMetaRow('💼', 'Role / Track', '{{opportunityTitle}}')}
              ${renderMetaRow('🎫', 'Application ID', '{{applicationId}}', true)}
              ${renderMetaRow('⏱️', 'Review Status', 'Under Initial Review')}
            </table>
          </td>
        </tr>
      </table>

      <!-- CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFF7ED" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #FFEDD5; border: 1px solid #FDBA74; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">📋</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #9A3412; margin-bottom: 3px;">
              Review Process &amp; Timeline
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.5;">
              Our evaluation committee reviews profiles on a rolling basis. You will be notified via email as your application advances.
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="{{opportunityUrl}}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              View Opportunity Details &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Your application for "{{opportunityTitle}}" (Application ID: {{applicationId}}) has been successfully received.

Our committee will review your profile and communicate updates via email.

Best regards,
AWS SBG CU-UP Career & Opportunities Desk`
  },

  // 7. Opportunity Shortlisted
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        CANDIDATE SHORTLISTED
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        You've Been <span style="color: #FF9900;">Shortlisted!</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Congratulations! Following our initial review, you have been <strong>Shortlisted</strong> for the <strong>{{opportunityTitle}}</strong> role.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- NEXT STEPS CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFF7ED" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #FFEDD5; border: 1px solid #FDBA74; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">🎯</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #9A3412; margin-bottom: 3px;">
              Next Steps &amp; Instructions
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.5;">
              {{nextSteps}}
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="https://www.awssbgcuup.tech/opportunities" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Check Application Portal &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Congratulations! You have been shortlisted for "{{opportunityTitle}}".
Next Steps: {{nextSteps}}

Best regards,
AWS SBG CU-UP Career Desk`
  },

  // 8. Opportunity Selected
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        OFFICIAL SELECTION &amp; OFFER
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Welcome to the <span style="color: #FF9900;">Team!</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Congratulations! We are thrilled to offer you the position of <strong>{{opportunityTitle}}</strong> with the AWS Student Builder Group at Chandigarh University &ndash; Uttar Pradesh.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- ONBOARDING CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#ECFDF5" style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #D1FAE5; border: 1px solid #6EE7B7; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">🎉</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #065F46; margin-bottom: 3px;">
              Onboarding &amp; Next Steps
            </div>
            <div style="font-size: 13px; color: #064E3B; line-height: 1.5;">
              {{onboardingNotes}}
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="https://www.awssbgcuup.tech/opportunities" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Join Team Workspace &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Congratulations! You have been selected for "{{opportunityTitle}}".
Onboarding details: {{onboardingNotes}}

Best regards,
AWS SBG CU-UP Leadership`
  },

  // 9. Opportunity Rejected
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #94A3B8; text-transform: uppercase; margin-bottom: 8px;">
        APPLICATION UPDATE
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Application <span style="color: #94A3B8;">Update</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Thank you for your interest and for taking the time to apply for <strong>{{opportunityTitle}}</strong> with the AWS Student Builder Group at Chandigarh University &ndash; Uttar Pradesh.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- COMMITTEE NOTE CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">
              Recruitment Committee Note
            </div>
            <div style="font-size: 13px; color: #475569; line-height: 1.6;">
              We received a large number of outstanding applications. While we are unable to offer you this position at this time, we were impressed by your passion for cloud computing and emerging technology.
            </div>
            <div style="font-size: 13px; color: #475569; line-height: 1.6; margin-top: 10px;">
              We encourage you to participate in our upcoming workshops, technical bootcamps, and future recruitment cycles.
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="https://www.awssbgcuup.tech/events" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Explore Upcoming Workshops &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Thank you for applying for "{{opportunityTitle}}".
While we are unable to offer you this position at this time, we encourage you to stay involved in our upcoming community events and future opportunities.

Best regards,
AWS SBG CU-UP Recruitment Committee`
  },

  // 10. Exam Credentials & Instructions
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        EXAM ACCESS CREDENTIALS
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Assessment <span style="color: #FF9900;">Access Key</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Your confidential credentials for <strong>{{examName}}</strong> are ready. Use these credentials to enter the Exam Lobby.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- CREDENTIALS CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 14px;">
              {{examName}}
            </div>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              ${renderMetaRow('🔑', 'Exam ID / Code', '{{examCode}}', true)}
              ${renderMetaRow('🔒', 'Access Password', '{{examPassword}}', true)}
              ${renderMetaRow('⏱️', 'Duration', '{{durationMinutes}} Minutes')}
            </table>
          </td>
        </tr>
      </table>

      <!-- INSTRUCTIONS CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFF7ED" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #FFEDD5; border: 1px solid #FDBA74; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">🛡️</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #9A3412; margin-bottom: 3px;">
              Important Proctor Instructions
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.5;">
              Join the Exam Lobby at least 10 minutes early. Proctors will verify your identity before unlocking your assessment workstation.
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="{{examUrl}}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Open Exam Lobby &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Exam Credentials for "{{examName}}":
- Exam Code: {{examCode}}
- Password: {{examPassword}}
- Duration: {{durationMinutes}} Minutes

Access the lobby at: {{examUrl}}

Best regards,
AWS SBG CU-UP Examination Board`
  },

  // 11. Exam Reminder
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        ASSESSMENT REMINDER
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Assessment <span style="color: #FF9900;">Starting Soon</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        This is a reminder that your scheduled technical assessment <strong>{{examName}}</strong> is commencing shortly.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- DETAILS CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 14px;">
              {{examName}}
            </div>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              ${renderMetaRow('🔑', 'Exam Code', '{{examCode}}', true)}
              ${renderMetaRow('⏱️', 'Duration', '{{durationMinutes}} Minutes')}
            </table>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="{{examUrl}}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Enter Exam Portal &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Reminder: Your assessment "{{examName}}" (Exam Code: {{examCode}}) is starting soon.
Duration: {{durationMinutes}} Minutes

Access portal: {{examUrl}}

Best regards,
AWS SBG CU-UP Examination Board`
  },

  // 12. Exam Submitted Successfully
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #10B981; text-transform: uppercase; margin-bottom: 8px;">
        ASSESSMENT RESPONSE RECORDED
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Response <span style="color: #10B981;">Recorded!</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Your examination response for <strong>{{examName}}</strong> has been successfully received and recorded in our secure evaluation database.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- SUBMISSION RECEIPT CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 14px;">
              Submission Receipt
            </div>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              ${renderMetaRow('👤', 'Candidate Name', '{{studentName}}')}
              ${renderMetaRow('🎓', 'Roll / Student ID', '{{rollNumber}}', true)}
              ${renderMetaRow('📝', 'Assessment', '{{examName}}')}
              ${renderMetaRow('✅', 'Status', 'Response Recorded')}
            </table>
          </td>
        </tr>
      </table>

      <!-- NOTICE CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#EFF6FF" style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #DBEAFE; border: 1px solid #93C5FD; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">✉️</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #1E40AF; margin-bottom: 3px;">
              Result Announcement Notice
            </div>
            <div style="font-size: 13px; color: #1E3A8A; line-height: 1.5;">
              Your responses are undergoing server-side evaluation. Your official scorecard will be delivered directly to your email inbox. Results are not displayed on the public website.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Your assessment response for "{{examName}}" (Roll: {{rollNumber}}) has been recorded.

Your result will be communicated separately by email.

Best regards,
AWS SBG CU-UP Examination Board`
  },

  // 13. Exam Result Scorecard (EMAIL ONLY)
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        OFFICIAL ASSESSMENT SCORECARD
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Official <span style="color: #FF9900;">Scorecard</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Your assessment responses for <strong>{{examName}}</strong> have been authoritatively evaluated by the Examination Board.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- SCORECARD DETAILS CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 14px;">
              Performance Summary
            </div>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              ${renderMetaRow('👤', 'Candidate Name', '{{studentName}}')}
              ${renderMetaRow('🎓', 'Roll / Student ID', '{{rollNumber}}', true)}
              ${renderMetaRow('📊', 'Earned Score', '{{score}} / {{totalMarks}}')}
              ${renderMetaRow('📈', 'Percentage', '{{percentage}}%')}
              ${renderMetaRow('🎯', 'Passing Benchmark', '{{passingPercentage}}%')}
              <tr>
                <td width="36" valign="middle" style="width: 36px; padding: 8px 0;">
                  <div style="width: 32px; height: 32px; background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 50%; text-align: center; line-height: 32px; font-size: 15px;">🏆</div>
                </td>
                <td valign="middle" style="padding: 8px 0 8px 10px;">
                  <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Final Verdict</div>
                  <div style="margin-top: 4px;">
                    <span style="display: inline-block; padding: 4px 14px; border-radius: 6px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; background-color: rgba(255, 153, 0, 0.1); color: {{verdictColor}}; border: 1px solid {{verdictColor}};">
                      {{verdict}}
                    </span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- VERIFICATION CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFF7ED" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #FFEDD5; border: 1px solid #FDBA74; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">📜</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #9A3412; margin-bottom: 3px;">
              Official Evaluation Record
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.5;">
              This scorecard is authoritative and issued directly by the AWS Student Builder Group Examination Board at Chandigarh University &ndash; UP.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
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

  // 14. Exam Selected / Qualified
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        CANDIDATE QUALIFICATION NOTICE
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Congratulations! <span style="color: #FF9900;">You're Qualified!</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Based on your exemplary performance in <strong>{{examName}}</strong>, the evaluation committee has marked you as <strong>SELECTED &amp; QUALIFIED</strong>.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- QUALIFICATION NOTES CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#ECFDF5" style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #D1FAE5; border: 1px solid #6EE7B7; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">🌟</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #065F46; margin-bottom: 3px;">
              Proctor / Committee Notes
            </div>
            <div style="font-size: 13px; color: #064E3B; line-height: 1.5;">
              {{selectionNotes}}
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="https://www.awssbgcuup.tech/exam" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Visit Assessment Center &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Congratulations! You have been SELECTED & QUALIFIED in "{{examName}}".
Evaluation Notes: {{selectionNotes}}

Best regards,
AWS SBG CU-UP Evaluation Committee`
  },

  // 15. Feedback Received Acknowledgement
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        COMMUNITY FEEDBACK
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Thank You for <span style="color: #FF9900;">Your Input!</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Thank you for sharing your thoughts with the AWS Student Builder Group at Chandigarh University &ndash; Uttar Pradesh.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- FEEDBACK SUMMARY CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 8px;">
              Submission Received under {{category}}
            </div>
            <div style="font-size: 13px; color: #64748B; font-style: italic; line-height: 1.6; background-color: #F8FAFC; padding: 14px; border-radius: 8px; border-left: 3px solid #FF9900;">
              "{{messageSummary}}"
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="https://www.awssbgcuup.tech" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Visit Community Portal &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{studentName}},

Thank you for your feedback regarding "{{category}}". We appreciate your contribution to improving our community initiatives.

Best regards,
AWS SBG CU-UP Community Team`
  },

  // 16. General Notification / Announcement
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        OFFICIAL ANNOUNCEMENT &bull; {{announcementCategory}}
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 30px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        {{announcementTitle}}
      </h1>
      <div style="font-size: 13px; color: #94A3B8;">
        Published on {{announcementDate}}
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- CONTENT CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 14px; color: #0F172A; line-height: 1.7;">
              {{announcementContent}}
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="https://www.awssbgcuup.tech" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Read on Community Portal &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Official Announcement: {{announcementTitle}}
{{announcementCategory}} - {{announcementDate}}

{{announcementContent}}

Best regards,
AWS Student Builder Group (CU-UP)`
  },

  // 17. Admin Manual Message
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        OFFICIAL COMMUNICATION
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Official <span style="color: #FF9900;">Notice</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF;">
        Dear {{recipientName}},
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- MESSAGE CONTENT CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 14px; color: #0F172A; line-height: 1.7;">
              {{messageContent}}
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="https://www.awssbgcuup.tech" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              Visit Portal &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `Dear {{recipientName}},

{{messageContent}}

Best regards,
AWS Student Builder Group (CU-UP)`
  },

  // 18. System Test Email
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
    bodyHtml: `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #10B981; text-transform: uppercase; margin-bottom: 8px;">
        SYSTEM HEALTH VERIFICATION
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Infrastructure <span style="color: #10B981;">Live &amp; Verified</span>
      </h1>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        This is a live verification email dispatched from the AWS SBG CU-UP Centralized Email Infrastructure.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- STATUS DETAILS CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-bottom: 14px;">
              Provider Connection Status
            </div>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              ${renderMetaRow('⚡', 'Provider', 'Resend (awssbgcuup.tech)')}
              ${renderMetaRow('⏱️', 'Dispatched At', '{{timestamp}}')}
              ${renderMetaRow('👤', 'Triggered By', '{{adminUser}}')}
            </table>
          </td>
        </tr>
      </table>

      <!-- CALLOUT -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#ECFDF5" style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td width="42" valign="top" style="width: 42px; padding-right: 14px;">
            <div style="width: 38px; height: 38px; background-color: #D1FAE5; border: 1px solid #6EE7B7; border-radius: 10px; text-align: center; line-height: 38px; font-size: 20px;">✅</div>
          </td>
          <td valign="middle">
            <div style="font-size: 14px; font-weight: 800; color: #065F46; margin-bottom: 3px;">
              Infrastructure Operational
            </div>
            <div style="font-size: 13px; color: #064E3B; line-height: 1.5;">
              All transactional routing, official sender identities, templating engine, and database audit logs are functioning optimally.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
    bodyText: `AWS SBG CU-UP Live Test Email

Provider: Resend (awssbgcuup.tech)
Dispatched At: {{timestamp}}
Triggered By: {{adminUser}}

All email services are fully operational.`
  }
];
