import { CONTEST_CONFIG } from '@/lib/contestConfig';

export interface ContestEmailData {
  name: string;
  email: string;
  university?: string;
  registrationId: string;
}

export function generateContestRegistrationEmailHtml(data: ContestEmailData): string {
  const recipientName = data.name || 'Participant';
  const university = data.university || 'Chandigarh University – Uttar Pradesh';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AWS Card Clash: Security Island Contest Confirmation</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0B0908;
      color: #F8F2EA;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: #F5C451;
      text-decoration: underline;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0908; color: #F8F2EA;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0908;">
    <tr>
      <td align="center" style="padding: 30px 15px;">
        
        <!-- Main Email Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #1A120E; border: 1px solid #3A271E; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
          
          <!-- Header Bar with Gold Border -->
          <tr>
            <td style="background-color: #211713; padding: 24px 30px; border-bottom: 2px solid #F5C451; text-align: center;">
              <span style="display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: #F5C451; margin-bottom: 6px;">
                AWS STUDENT BUILDER GROUP
              </span>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #F8F2EA; letter-spacing: -0.02em;">
                AWS Card Clash: Security Island Contest
              </h1>
            </td>
          </tr>

          <!-- Hero Greeting -->
          <tr>
            <td style="padding: 32px 30px 20px 30px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #F5C451;">
                Hello ${recipientName},
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #B9AAA0;">
                Your registration for the <strong>AWS Card Clash: Security Island Contest</strong> is confirmed! You are now eligible to compete against the AI, defend 15 real AWS security architectures, and win an <strong>AWS Certified AI Practitioner exam voucher</strong>.
              </p>
            </td>
          </tr>

          <!-- Launch Time Banner -->
          <tr>
            <td style="padding: 0 30px 24px 30px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #261710; border: 1px solid #E98B32; border-radius: 12px; padding: 16px;">
                <tr>
                  <td style="padding: 4px 8px; text-align: center;">
                    <span style="font-size: 11px; font-weight: 700; color: #E98B32; text-transform: uppercase; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">
                      CONTEST LAUNCH TIME
                    </span>
                    <span style="font-size: 16px; font-weight: 800; color: #F8F2EA;">
                      ${CONTEST_CONFIG.launchDateIstString}
                    </span>
                    <span style="font-size: 12px; color: #B9AAA0; display: block; margin-top: 4px;">
                      (Contest ends 4 December 2026, 11:59 PM IST)
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Official Event Code Highlight Box -->
          <tr>
            <td style="padding: 0 30px 28px 30px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #120C09; border: 2px dashed #F5C451; border-radius: 14px; text-align: center; padding: 20px;">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 700; color: #F5C451; text-transform: uppercase; letter-spacing: 0.2em; display: block; margin-bottom: 8px;">
                      YOUR OFFICIAL EVENT CODE
                    </span>
                    <div style="font-size: 38px; font-weight: 900; letter-spacing: 0.25em; font-family: monospace, Courier, sans-serif; color: #FFFFFF; text-shadow: 0 0 15px rgba(245,196,81,0.5);">
                      ${CONTEST_CONFIG.eventCode}
                    </div>
                    <span style="font-size: 12px; color: #B9AAA0; display: block; margin-top: 8px;">
                      Enter this code inside AWS Card Clash under Multiplayer → Check contests
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- How to Join Instructions -->
          <tr>
            <td style="padding: 0 30px 24px 30px;">
              <h3 style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #F8F2EA; text-transform: uppercase; letter-spacing: 0.05em;">
                Quick Setup Steps:
              </h3>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-bottom: 10px; font-size: 13px; color: #B9AAA0; line-height: 1.5;">
                    <strong style="color: #F5C451;">1. Download or Open:</strong> Install AWS Card Clash on iOS or Android, or open <a href="${CONTEST_CONFIG.webPlayUrl}" style="color: #F5C451;">cardclash.skillbuilder.aws</a> on a computer.
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px; font-size: 13px; color: #B9AAA0; line-height: 1.5;">
                    <strong style="color: #F5C451;">2. Sign In:</strong> Log in with your free AWS Skill Builder account.
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px; font-size: 13px; color: #B9AAA0; line-height: 1.5;">
                    <strong style="color: #F5C451;">3. Join Contest:</strong> Choose <em>Multiplayer</em>, then select <em>Check contests</em>.
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px; font-size: 13px; color: #B9AAA0; line-height: 1.5;">
                    <strong style="color: #F5C451;">4. Enter Code:</strong> Type in <strong>${CONTEST_CONFIG.eventCode}</strong> and choose <em>Join</em>.
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #B9AAA0; line-height: 1.5;">
                    <strong style="color: #F5C451;">5. Play & Win:</strong> Master the 15 security levels, defeat the dragon, and watch your rank climb on the live leaderboard!
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Download Action Buttons -->
          <tr>
            <td style="padding: 0 30px 32px 30px; text-align: center;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 6px;">
                    <a href="${CONTEST_CONFIG.officialAppDownloadUrl}" style="display: inline-block; padding: 12px 24px; background-color: #F5C451; color: #0B0908; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 9999px; box-shadow: 0 4px 15px rgba(245,196,81,0.4);">
                      Get the App / Play Now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Registration Summary Box -->
          <tr>
            <td style="padding: 0 30px 24px 30px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #140E0A; border: 1px solid #2A1D17; border-radius: 8px; padding: 12px 16px; font-size: 11px; color: #8F8075;">
                <tr>
                  <td>
                    <strong>Participant:</strong> ${recipientName} (${data.email})<br>
                    <strong>Institution:</strong> ${university}<br>
                    <strong>Registration Ref:</strong> ${data.registrationId}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Mandatory Footer Notice -->
          <tr>
            <td style="background-color: #0F0A08; padding: 24px 30px; border-top: 1px solid #2A1D17; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #E98B32; font-weight: 600;">
                Please do not reply to this email. This inbox is not monitored.
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #736760; line-height: 1.4;">
                This message was sent to ${data.email} regarding your registration for the AWS Card Clash: Security Island Contest organized by the AWS Student Builder Group at Chandigarh University – Uttar Pradesh.
              </p>
              <p style="margin: 0; font-size: 10px; color: #594F49;">
                &copy; 2026 Amazon Web Services, Inc. or its affiliates. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Main Email Container -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}
