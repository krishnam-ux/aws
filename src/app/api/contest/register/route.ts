import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CONTEST_CONFIG, getContestState, maskEmail } from '@/lib/contestConfig';
import { checkRateLimit } from '@/lib/rateLimit';
import { isValidEmail, normalizeEmail } from '@/lib/email/validation';
import { sendEmail } from '@/lib/email/service';
import { generateContestRegistrationEmailHtml } from '@/lib/email/contestEmailTemplate';
import { scheduleEngagementForRegistration } from '@/lib/contestEngagementScheduler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Controlled test clock support (active for development and automated test suites)
    const testClockHeader = req.headers.get('x-test-contest-clock');
    const { searchParams } = new URL(req.url);
    const testClockParam = searchParams.get('testTime');
    const overrideDate = testClockHeader || testClockParam || null;

    const contestState = getContestState(overrideDate);

    // 2. Strict Server-Side Lock: Registration opens on 24 November 2026 at 9:00 AM IST
    if (contestState.isLocked) {
      return NextResponse.json(
        {
          success: false,
          isLocked: true,
          error: `Contest registration is locked until ${CONTEST_CONFIG.launchDateIstString}. Early registration is prohibited.`,
          launchDateIstString: CONTEST_CONFIG.launchDateIstString,
          timeRemainingMs: contestState.timeRemainingMs
        },
        { status: 403 }
      );
    }

    if (contestState.isEnded) {
      return NextResponse.json(
        {
          success: false,
          isEnded: true,
          error: 'The AWS Card Clash contest concluded on 4 December 2026. Registration is closed.'
        },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // Rate Limiting: Max 10 registration requests per IP per minute
    const rateLimit = checkRateLimit(`contest_reg_ip:${ip}`, {
      maxRequests: 10,
      windowMs: 60 * 1000,
      blockDurationMs: 60 * 1000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please wait a moment before trying again.'
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter || 60) }
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, email, university, studentId, consent } = body;

    // Field Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please provide your valid full name (at least 2 characters).' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!consent) {
      return NextResponse.json(
        { success: false, error: 'Please accept the community participation guidelines to register.' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const cleanedName = name.trim();
    const cleanedUniversity = (university && typeof university === 'string' && university.trim().length > 0)
      ? university.trim()
      : 'Chandigarh University – Uttar Pradesh';
    const cleanedStudentId = (studentId && typeof studentId === 'string')
      ? studentId.trim()
      : 'N/A';

    // Check for existing registration for this contest
    const allRegistrations = await db.eventRegistrations.getAll();
    const existing = allRegistrations.find(
      (r: any) =>
        String(r.email || '').toLowerCase().trim() === normalizedEmail &&
        r.eventId === CONTEST_CONFIG.eventId
    );

    if (existing) {
      // User is already registered - return their existing pass without duplicate email spam
      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        emailSent: true,
        message: CONTEST_CONFIG.successMessage,
        registration: {
          id: existing.id,
          name: existing.name || cleanedName,
          email: normalizedEmail,
          maskedEmail: maskEmail(normalizedEmail),
          university: existing.university || cleanedUniversity,
          appUrl: CONTEST_CONFIG.officialAppDownloadUrl,
          webUrl: CONTEST_CONFIG.webPlayUrl,
          qrCodeUrl: CONTEST_CONFIG.qrCodeAssetPath,
          launchTime: CONTEST_CONFIG.launchDateIstString
        }
      });
    }

    // Create unique registration ID
    const regId = `reg-clash-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newRegistration = {
      id: regId,
      eventId: CONTEST_CONFIG.eventId,
      eventName: CONTEST_CONFIG.eventName,
      name: cleanedName,
      email: normalizedEmail,
      university: cleanedUniversity,
      studentId: cleanedStudentId,
      status: 'Approved',
      attendance: 'Registered',
      date: nowIso,
      metadata: {
        source: 'contest_landing_page',
        eventCode: CONTEST_CONFIG.eventCode,
        registeredAt: nowIso
      }
    };

    // Save record to DB
    await db.eventRegistrations.insertOne(newRegistration);

    // Schedule automated engagement campaign (24 to 72 hours randomized intervals)
    try {
      scheduleEngagementForRegistration({
        registrationId: regId,
        name: cleanedName,
        email: normalizedEmail,
        university: cleanedUniversity,
        registeredAt: nowIso,
        nowOverride: overrideDate || undefined
      });
    } catch (schedErr) {
      console.error('Non-blocking schedule initialization error:', schedErr);
    }

    // Send Contest-specific confirmation email
    let emailSent = false;
    let emailError: string | null = null;

    try {
      const emailHtml = generateContestRegistrationEmailHtml({
        name: cleanedName,
        email: normalizedEmail,
        university: cleanedUniversity,
        registrationId: regId
      });

      const sendResult = await sendEmail({
        to: normalizedEmail,
        recipientName: cleanedName,
        subject: 'Confirmation: AWS Card Clash Security Island Contest Access & Event Code',
        html: emailHtml,
        type: 'event_registration_confirmation',
        category: 'EVENTS',
        metadata: {
          contestEventId: CONTEST_CONFIG.eventId,
          registrationId: regId
        }
      });

      if (sendResult.success) {
        emailSent = true;
      } else {
        emailError = sendResult.error || 'Email dispatch failed';
      }
    } catch (emailErr: any) {
      console.error('Contest confirmation email send error:', emailErr);
      emailError = emailErr?.message || 'Email delivery exception';
    }

    if (emailSent) {
      return NextResponse.json({
        success: true,
        alreadyRegistered: false,
        emailSent: true,
        message: CONTEST_CONFIG.successMessage,
        registration: {
          id: regId,
          name: cleanedName,
          email: normalizedEmail,
          maskedEmail: maskEmail(normalizedEmail),
          university: cleanedUniversity,
          appUrl: CONTEST_CONFIG.officialAppDownloadUrl,
          webUrl: CONTEST_CONFIG.webPlayUrl,
          qrCodeUrl: CONTEST_CONFIG.qrCodeAssetPath,
          launchTime: CONTEST_CONFIG.launchDateIstString
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        alreadyRegistered: false,
        emailSent: false,
        emailError: emailError || 'Failed to dispatch email',
        message: 'Registration was successfully recorded, but the confirmation email could not be delivered immediately. Please use the resend button below.',
        registration: {
          id: regId,
          name: cleanedName,
          email: normalizedEmail,
          maskedEmail: maskEmail(normalizedEmail),
          university: cleanedUniversity,
          appUrl: CONTEST_CONFIG.officialAppDownloadUrl,
          webUrl: CONTEST_CONFIG.webPlayUrl,
          qrCodeUrl: CONTEST_CONFIG.qrCodeAssetPath,
          launchTime: CONTEST_CONFIG.launchDateIstString
        }
      });
    }
  } catch (error: any) {
    console.error('Error during contest registration:', error);
    return NextResponse.json(
      { success: false, error: 'Registration could not be completed. Please try again.' },
      { status: 500 }
    );
  }
}
