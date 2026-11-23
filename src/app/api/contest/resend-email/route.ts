import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CONTEST_CONFIG, maskEmail } from '@/lib/contestConfig';
import { checkRateLimit } from '@/lib/rateLimit';
import { isValidEmail, normalizeEmail } from '@/lib/email/validation';
import { sendEmail } from '@/lib/email/service';
import { generateContestRegistrationEmailHtml } from '@/lib/email/contestEmailTemplate';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid registered email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // Rate Limiting: Max 2 resends per email per 2 minutes
    const rateLimit = checkRateLimit(`contest_resend:${normalizedEmail}`, {
      maxRequests: 2,
      windowMs: 2 * 60 * 1000,
      blockDurationMs: 2 * 60 * 1000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${rateLimit.retryAfter || 60} seconds before requesting another email resend.`
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter || 60) }
        }
      );
    }

    // Find registration in database
    const allRegistrations = await db.eventRegistrations.getAll();
    const registration = allRegistrations.find(
      (r: any) =>
        String(r.email || '').toLowerCase().trim() === normalizedEmail &&
        r.eventId === CONTEST_CONFIG.eventId
    );

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'No existing registration found with this email address. Please register first.' },
        { status: 404 }
      );
    }

    // Generate contest-specific email
    const emailHtml = generateContestRegistrationEmailHtml({
      name: registration.name || 'Contest Participant',
      email: normalizedEmail,
      university: registration.university || 'Chandigarh University – Uttar Pradesh',
      registrationId: registration.id
    });

    const sendResult = await sendEmail({
      to: normalizedEmail,
      recipientName: registration.name || 'Contest Participant',
      subject: 'Resent: AWS Card Clash Security Island Contest Access & Event Code',
      html: emailHtml,
      type: 'event_registration_confirmation',
      category: 'EVENTS',
      metadata: {
        contestEventId: CONTEST_CONFIG.eventId,
        registrationId: registration.id,
        isResend: true
      }
    });

    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          emailSent: false,
          error: sendResult.error || 'Email provider could not dispatch email. Please retry shortly.'
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      maskedEmail: maskEmail(normalizedEmail),
      message: 'Your registration confirmation and Event Code have been resent! Please check your inbox and spam folder.'
    });

  } catch (error: any) {
    console.error('Error during email resend:', error);
    return NextResponse.json(
      { success: false, error: 'Could not resend email. Please try again.' },
      { status: 500 }
    );
  }
}
