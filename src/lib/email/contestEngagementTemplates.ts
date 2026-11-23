import { CONTEST_CONFIG } from '@/lib/contestConfig';

export interface EngagementEmailParams {
  name: string;
  email: string;
  registrationId: string;
  unsubscribeToken?: string;
}

export interface EngagementTopic {
  id: string;
  subject: string;
  generateHtml: (params: EngagementEmailParams) => string;
}

function baseContestEmailWrapper(contentHtml: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AWS Card Clash: Security Island Contest</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0B0908;
      color: #F8F2EA;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
    a { color: #F5C451; text-decoration: underline; }
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
            <td style="background-color: #211713; padding: 22px 30px; border-bottom: 2px solid #F5C451; text-align: center;">
              <span style="display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: #F5C451; margin-bottom: 6px;">
                AWS STUDENT BUILDER GROUP
              </span>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #F8F2EA; letter-spacing: -0.02em;">
                AWS Card Clash: Security Island
              </h1>
            </td>
          </tr>

          <!-- Injected Campaign Content -->
          ${contentHtml}

          <!-- App Download CTA Button -->
          <tr>
            <td style="padding: 0 30px 28px 30px; text-align: center;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 6px;">
                    <a href="${CONTEST_CONFIG.officialAppDownloadUrl}" style="display: inline-block; padding: 12px 28px; background-color: #F5C451; color: #0B0908; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 9999px; box-shadow: 0 4px 15px rgba(245,196,81,0.4);">
                      Launch AWS Card Clash
                    </a>
                  </td>
                </tr>
              </table>
              <span style="display: block; font-size: 11px; color: #8F8075; margin-top: 10px;">
                On computer? Play at <a href="${CONTEST_CONFIG.webPlayUrl}" style="color: #F5C451;">cardclash.skillbuilder.aws</a>
              </span>
            </td>
          </tr>

          <!-- Mandatory Footer Notice & Unsubscribe -->
          <tr>
            <td style="background-color: #0F0A08; padding: 24px 30px; border-top: 1px solid #2A1D17; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #E98B32; font-weight: 600;">
                Please do not reply to this email. This inbox is not monitored.
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #736760; line-height: 1.4;">
                This contest update was sent to ${email} for the AWS Card Clash: Security Island Contest (24 November to 4 December 2026).
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #736760;">
                <a href="https://www.awssbgcuup.tech/api/contest/unsubscribe?email=${encodeURIComponent(email)}" style="color: #9E8E84; text-decoration: underline;">
                  Unsubscribe from contest updates
                </a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #594F49;">
                &copy; 2026 Amazon Web Services, Inc. or its affiliates. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const CONTEST_ENGAGEMENT_TOPICS: Record<string, EngagementTopic> = {
  // Topic 1: Play AWS Card Clash and explore Security Island
  'topic-explore-security-island': {
    id: 'topic-explore-security-island',
    subject: 'Explore Security Island in AWS Card Clash',
    generateHtml: ({ name, email }) => {
      const content = `
        <tr>
          <td style="padding: 32px 30px 20px 30px;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #F5C451;">
              Hello ${name || 'Contestant'},
            </h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #B9AAA0;">
              Have you explored the 15 architectures on <strong>Security Island</strong> yet? Every single level simulates real-world AWS security challenges that cloud architects face daily.
            </p>
            <div style="background-color: #211713; border: 1px solid #3A271E; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #F8F2EA; font-weight: 700;">
                Key Security Cards to Master:
              </h3>
              <p style="margin: 0; font-size: 13px; color: #B9AAA0; line-height: 1.6;">
                🛡️ <strong>AWS KMS & Secrets Manager</strong> — Secure encryption keys and sensitive credentials.<br>
                🔥 <strong>AWS WAF & Network Firewall</strong> — Block malicious traffic and web vulnerabilities.<br>
                🔍 <strong>Amazon GuardDuty & Macie</strong> — Detect active threats and inspect data exposure.
              </p>
            </div>
            <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #B9AAA0;">
              Open the app, join with your event code, and discover how placing the right security cards repels the dragon!
            </p>
          </td>
        </tr>`;
      return baseContestEmailWrapper(content, email);
    }
  },

  // Topic 2: Earn stars and climb the leaderboard
  'topic-climb-leaderboard': {
    id: 'topic-climb-leaderboard',
    subject: 'Earn Stars & Climb the Security Island Leaderboard',
    generateHtml: ({ name, email }) => {
      const content = `
        <tr>
          <td style="padding: 32px 30px 20px 30px;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #F5C451;">
              Climb the Ranks, ${name || 'Contestant'}!
            </h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #B9AAA0;">
              Did you know there are <strong>45 total stars</strong> waiting to be claimed on Security Island? The higher your efficiency and architectural accuracy, the more stars you earn.
            </p>
            <div style="background-color: #261710; border: 1px solid #E98B32; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 6px 0; font-size: 14px; color: #E98B32; font-weight: 700;">
                Pro Tip for Maximum Points:
              </h3>
              <p style="margin: 0; font-size: 13px; color: #F8F2EA; line-height: 1.5;">
                Replay completed levels with optimal card placements to push your 2-star victories into 3-star triumphs. Every star directly elevates your standing on the contest leaderboard!
              </p>
            </div>
            <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #B9AAA0;">
              Head back into the game, select <em>Multiplayer</em> → <em>Check contests</em>, and see where you rank today.
            </p>
          </td>
        </tr>`;
      return baseContestEmailWrapper(content, email);
    }
  },

  // Topic 3: Top 5 participants win vouchers
  'topic-top-5-prizes': {
    id: 'topic-top-5-prizes',
    subject: 'Reminder: Top 5 Win AWS Certified AI Practitioner Exam Vouchers',
    generateHtml: ({ name, email }) => {
      const content = `
        <tr>
          <td style="padding: 32px 30px 20px 30px;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #F5C451;">
              Aim for the Top 5, ${name || 'Contestant'}!
            </h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #B9AAA0;">
              A quick reminder of what is at stake: the <strong>top 5 ranking participants</strong> on the official Security Island contest leaderboard when the contest closes on <strong>4 December 2026</strong> will each receive an <strong>AWS Certified AI Practitioner exam voucher</strong>!
            </p>
            <div style="background-color: #1A130C; border: 1px dashed #F5C451; border-radius: 12px; padding: 18px; margin-bottom: 20px; text-align: center;">
              <span style="font-size: 11px; font-weight: 700; color: #F5C451; text-transform: uppercase; letter-spacing: 0.15em;">
                OFFICIAL CONTEST REWARD
              </span>
              <h3 style="margin: 6px 0; font-size: 16px; color: #F8F2EA; font-weight: 800;">
                5x AWS Certified AI Practitioner Exam Vouchers
              </h3>
              <p style="margin: 0; font-size: 12px; color: #B9AAA0;">
                Awarded to the top 5 players on the leaderboard on 4 December 2026.
              </p>
            </div>
            <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #B9AAA0;">
              Keep defending against the dragon and improving your level completion scores to stay in the running!
            </p>
          </td>
        </tr>`;
      return baseContestEmailWrapper(content, email);
    }
  },

  // Topic 4: Explore more security challenges
  'topic-security-challenges': {
    id: 'topic-security-challenges',
    subject: 'Master Layer 7 Defense & Gen AI Cloud Security',
    generateHtml: ({ name, email }) => {
      const content = `
        <tr>
          <td style="padding: 32px 30px 20px 30px;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #F5C451;">
              Tackle Advanced Defense Patterns, ${name || 'Contestant'}
            </h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #B9AAA0;">
              As you progress through Security Island, the challenge intensifies. Levels 10 through 15 introduce sophisticated cloud security patterns:
            </p>
            <div style="background-color: #211713; border: 1px solid #3A271E; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #F8F2EA; line-height: 1.6;">
                🔒 <strong>Level 10:</strong> Secure Sensitive Log Data with CloudWatch & KMS<br>
                💳 <strong>Level 11:</strong> Securing Payment APIs against Layer 7 Exploits<br>
                🏢 <strong>Level 12:</strong> Centralized Logging at Enterprise Scale<br>
                ⚡ <strong>Level 14 & 15:</strong> Mitigating Generative AI and Foundation Model Threats
              </p>
            </div>
            <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #B9AAA0;">
              Each victory gives you deep, hands-on architectural instincts while earning points toward the grand prize.
            </p>
          </td>
        </tr>`;
      return baseContestEmailWrapper(content, email);
    }
  },

  // Topic 5: Keep competing before the contest closes
  'topic-keep-competing': {
    id: 'topic-keep-competing',
    subject: 'Keep Competing on Security Island Before Contest Closes',
    generateHtml: ({ name, email }) => {
      const content = `
        <tr>
          <td style="padding: 32px 30px 20px 30px;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #F5C451;">
              Stay in the Battle, ${name || 'Contestant'}!
            </h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #B9AAA0;">
              The AWS Card Clash: Security Island Contest is in full swing! Players from across Chandigarh University – Uttar Pradesh are battling the dragon and climbing the leaderboard.
            </p>
            <div style="background-color: #211713; border: 1px solid #4A2D19; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #F8F2EA; line-height: 1.5;">
                Remember: The contest concludes on <strong>4 December 2026</strong>. Scores achieved before the deadline are finalized for voucher distribution.
              </p>
            </div>
            <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #B9AAA0;">
              Every card choice counts. Log in today, refine your defensive architectures, and defend your rank!
            </p>
          </td>
        </tr>`;
      return baseContestEmailWrapper(content, email);
    }
  },

  // Final-Day Reminder: 4 December 2026
  'topic-final-day-reminder': {
    id: 'topic-final-day-reminder',
    subject: 'FINAL DAY: AWS Card Clash Security Island Contest Closes Tonight!',
    generateHtml: ({ name, email }) => {
      const content = `
        <tr>
          <td style="padding: 32px 30px 20px 30px;">
            <div style="background-color: #38150A; border: 2px solid #E98B32; border-radius: 12px; padding: 14px; text-align: center; margin-bottom: 18px;">
              <span style="font-size: 11px; font-weight: 800; color: #F5C451; text-transform: uppercase; letter-spacing: 0.2em;">
                FINAL DAY NOTICE • CLOSES TONIGHT
              </span>
              <h2 style="margin: 6px 0 0 0; font-size: 18px; font-weight: 900; color: #FFFFFF;">
                Contest Ends Today: 4 December 2026
              </h2>
            </div>
            <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #F5C451;">
              Final Call, ${name || 'Contestant'}!
            </h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #B9AAA0;">
              Today, <strong>4 December 2026</strong>, is the final day of the AWS Card Clash: Security Island Contest. At <strong>11:59 PM IST tonight</strong>, all scores will be locked and the final leaderboard will be frozen.
            </p>
            <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #F8F2EA;">
              This is your last opportunity to complete remaining levels, push for 3 stars, and claim a spot among the <strong>top 5 participants</strong> to win an <strong>AWS Certified AI Practitioner exam voucher</strong>.
            </p>
            <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #B9AAA0;">
              Enter the game now and make your final moves count!
            </p>
          </td>
        </tr>`;
      return baseContestEmailWrapper(content, email);
    }
  }
};
