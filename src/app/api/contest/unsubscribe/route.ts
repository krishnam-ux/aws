import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeParticipant } from '@/lib/contestEngagementScheduler';
import { isValidEmail } from '@/lib/email/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email || !isValidEmail(email)) {
    return new NextResponse('Invalid or missing email address.', { status: 400 });
  }

  const success = unsubscribeParticipant(email);

  return new NextResponse(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Unsubscribed from Contest Updates</title>
  <style>
    body {
      margin: 0;
      padding: 40px 20px;
      background-color: #0B0908;
      color: #F8F2EA;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
    }
    .card {
      max-width: 480px;
      margin: 40px auto;
      background-color: #211713;
      border: 1px solid #3A271E;
      border-radius: 16px;
      padding: 32px 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
    }
    h1 { color: #F5C451; font-size: 22px; margin-bottom: 12px; }
    p { color: #B9AAA0; font-size: 14px; line-height: 1.6; }
    a { color: #F5C451; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Preferences Updated</h1>
    <p>
      <strong>${email}</strong> has been successfully unsubscribed from optional contest engagement and reminder emails.
    </p>
    <p style="margin-top: 16px;">
      Your official contest registration and Event Code remain active. You can still participate in the Security Island contest!
    </p>
    <p style="margin-top: 24px;">
      <a href="/contest">Return to Contest Homepage</a>
    </p>
  </div>
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
