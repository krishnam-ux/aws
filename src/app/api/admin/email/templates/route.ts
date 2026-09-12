import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_EMAIL_TEMPLATES, interpolateVariables, renderEmailLayout } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email';
import { EmailTemplate } from '@/types/email';

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

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const savedTemplates = await db.emailTemplates.getAll();
    const savedMap = new Map(savedTemplates.map((t: any) => [t.type, t]));

    // Merge defaults with any overrides in database
    const mergedTemplates: EmailTemplate[] = DEFAULT_EMAIL_TEMPLATES.map((defaultTpl) => {
      const saved = savedMap.get(defaultTpl.type);
      return saved ? { ...defaultTpl, ...saved } : defaultTpl;
    });

    // Add any completely custom templates that aren't in defaults
    for (const saved of savedTemplates) {
      if (!DEFAULT_EMAIL_TEMPLATES.some((d) => d.type === saved.type)) {
        mergedTemplates.push(saved);
      }
    }

    return NextResponse.json({ templates: mergedTemplates }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error fetching email templates:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch templates' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const { action, template, testRecipient, sampleVariables } = body;

    // 1. Preview Rendering Action
    if (action === 'preview') {
      const vars = sampleVariables || {
        memberName: 'Krishnam Dwivedi',
        memberRole: 'Technical Lead',
        memberDomain: 'Cloud & Infrastructure',
        memberEmail: 'krishnamdwivedi17@gmail.com',
        studentName: 'Alex Smith',
        eventName: 'Cloud Practitioner Bootcamp',
        eventDate: 'September 20, 2026',
        eventTime: '10:00 AM IST',
        venue: 'Seminar Hall 3, Block B',
        registrationId: 'REG-839210',
        eventUrl: 'https://www.awssbgcuup.tech/events',
        opportunityTitle: 'AWS Cloud Architecture Fellow',
        role: 'Core Engineering Track',
        domain: 'Cloud & Infrastructure',
        applicationId: 'APP-99482',
        examName: 'AWS Certified Cloud Practitioner Simulation',
        examCode: 'AWS-CCP-2026',
        score: '85',
        totalMarks: '100',
        percentage: '85.0',
        verdict: 'PASSED',
        verdictColor: '#10B981',
        passingPercentage: '70'
      };

      const renderedSubject = interpolateVariables(template.subject || '', vars);
      const renderedBody = interpolateVariables(template.bodyHtml || '', vars);
      const fullHtml = renderEmailLayout({
        title: renderedSubject,
        contentHtml: renderedBody
      });

      return NextResponse.json(
        {
          renderedSubject,
          renderedHtml: fullHtml
        },
        { headers: noStoreHeaders }
      );
    }

    // 2. Test Email Dispatch
    if (action === 'test_send') {
      if (!testRecipient) {
        return NextResponse.json(
          { error: 'Recipient address required for test send.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const vars = sampleVariables || {
        studentName: 'Test Recipient',
        eventName: 'Test Event Title',
        eventDate: 'September 20, 2026',
        eventTime: '10:00 AM IST',
        venue: 'Chandigarh University',
        registrationId: 'TEST-123456'
      };

      const renderedSubject = `[TEST] ${interpolateVariables(template.subject || 'Test Notification', vars)}`;
      const renderedBody = interpolateVariables(template.bodyHtml || '<p>This is a test preview message.</p>', vars);
      const fullHtml = renderEmailLayout({
        title: renderedSubject,
        contentHtml: renderedBody
      });

      const result = await sendEmail({
        to: testRecipient,
        subject: renderedSubject,
        html: fullHtml,
        type: 'system_test_email',
        category: 'ADMIN',
        triggeredBy: 'ADMIN_PREVIEW_TEST',
        isTest: true
      });

      return NextResponse.json({ success: result.success, result }, { headers: noStoreHeaders });
    }

    // 3. Upsert Template
    if (!template || !template.type || !template.subject || !template.bodyHtml) {
      return NextResponse.json(
        { error: 'Template object with type, subject, and bodyHtml is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const templateToSave: EmailTemplate = {
      id: template.id || `tpl-${template.type}`,
      name: template.name || template.type,
      type: template.type,
      category: template.category || 'COMMUNITY',
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText || '',
      variables: template.variables || [],
      description: template.description || '',
      isActive: template.isActive !== undefined ? Boolean(template.isActive) : true,
      updatedAt: new Date().toISOString()
    };

    await db.emailTemplates.upsert(templateToSave);

    return NextResponse.json({ success: true, template: templateToSave }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error saving/processing email template:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process template request.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
