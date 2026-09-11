import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { siteConfig } from '@/data/siteConfig';
import { EmailRecipient } from '@/types/email';

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

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'ALL'; // 'ALL' | 'EVENT' | 'OPPORTUNITY' | 'EXAM' | 'TEAM' | 'SELECTED' | 'STUDENTS'
    const eventId = searchParams.get('eventId');
    const examId = searchParams.get('examId');
    const opportunityId = searchParams.get('opportunityId');

    const recipientMap = new Map<string, EmailRecipient>();

    // 1. Event Registrations & Community
    if (source === 'ALL' || source === 'EVENT' || source === 'STUDENTS') {
      try {
        let eventRegs = await db.eventRegistrations.getAll();
        if (eventId && eventId !== 'ALL') {
          eventRegs = eventRegs.filter((r: any) => r.eventId === eventId);
        }
        for (const reg of eventRegs) {
          const email = (reg.email || '').trim().toLowerCase();
          if (email && email.includes('@') && !recipientMap.has(email)) {
            recipientMap.set(email, {
              email,
              name: reg.name || 'Event Attendee',
              studentId: reg.studentId || reg.student_id || reg.rollNumber || '',
              source: 'EVENT'
            });
          }
        }

        let registrations = await db.registrations.getAll();
        for (const reg of registrations) {
          const email = (reg.email || '').trim().toLowerCase();
          if (email && email.includes('@') && !recipientMap.has(email)) {
            recipientMap.set(email, {
              email,
              name: reg.name || 'Community Member',
              studentId: reg.studentId || reg.student_id || '',
              source: 'EVENT'
            });
          }
        }
      } catch (err) {
        console.error('Error querying event registrations for recipients:', err);
      }
    }

    // 2. Career & Opportunity Applications
    if (source === 'ALL' || source === 'OPPORTUNITY' || source === 'STUDENTS') {
      try {
        let applications = await db.careerApplications.getAll();
        if (opportunityId && opportunityId !== 'ALL') {
          applications = applications.filter((a: any) => a.opportunityId === opportunityId);
        }
        for (const app of applications) {
          const email = (app.email || '').trim().toLowerCase();
          if (email && email.includes('@') && !recipientMap.has(email)) {
            recipientMap.set(email, {
              email,
              name: app.fullName || app.studentName || app.name || 'Opportunity Applicant',
              studentId: app.studentId || '',
              source: 'OPPORTUNITY'
            });
          }
        }
      } catch (err) {
        console.error('Error querying career applications for recipients:', err);
      }
    }

    // 3. Certification Exam Candidates
    if (source === 'ALL' || source === 'EXAM' || source === 'STUDENTS') {
      try {
        let attempts = await db.examAttempts.getAll();
        if (examId && examId !== 'ALL') {
          attempts = attempts.filter((a: any) => a.examId === examId);
        }
        for (const attempt of attempts) {
          const email = (attempt.email || '').trim().toLowerCase();
          if (email && email.includes('@') && !recipientMap.has(email)) {
            recipientMap.set(email, {
              email,
              name: attempt.studentName || 'Exam Candidate',
              studentId: attempt.rollNumber || '',
              rollNumber: attempt.rollNumber || '',
              source: 'EXAM'
            });
          }
        }
      } catch (err) {
        console.error('Error querying exam candidates for recipients:', err);
      }
    }

    // 4. Selected Candidates Only
    if (source === 'SELECTED') {
      try {
        const attempts = await db.examAttempts.getAll();
        for (const attempt of attempts) {
          if (attempt.selectionStatus === 'SELECTED' || attempt.selected === true) {
            const email = (attempt.email || '').trim().toLowerCase();
            if (email && email.includes('@') && !recipientMap.has(email)) {
              recipientMap.set(email, {
                email,
                name: attempt.studentName || 'Selected Candidate',
                studentId: attempt.rollNumber || '',
                rollNumber: attempt.rollNumber || '',
                source: 'EXAM'
              });
            }
          }
        }

        const applications = await db.careerApplications.getAll();
        for (const app of applications) {
          if (app.status === 'Accepted' || app.status === 'Selected' || app.status === 'Shortlisted') {
            const email = (app.email || '').trim().toLowerCase();
            if (email && email.includes('@') && !recipientMap.has(email)) {
              recipientMap.set(email, {
                email,
                name: app.fullName || app.studentName || app.name || 'Selected Applicant',
                studentId: app.studentId || '',
                source: 'OPPORTUNITY'
              });
            }
          }
        }
      } catch (err) {
        console.error('Error querying selected candidates for recipients:', err);
      }
    }

    // 5. Team Members
    if (source === 'ALL' || source === 'TEAM') {
      try {
        const teamMembers: any[] = [siteConfig.leader, siteConfig.facultyContact].filter(Boolean);
        for (const member of teamMembers) {
          const email = (member.email || siteConfig.email || '').trim().toLowerCase();
          if (email && email.includes('@') && !recipientMap.has(email)) {
            recipientMap.set(email, {
              email,
              name: member.name || 'Team Member',
              source: 'TEAM'
            });
          }
        }
      } catch (err) {
        console.error('Error querying team members for recipients:', err);
      }
    }

    const recipients = Array.from(recipientMap.values());

    return NextResponse.json(
      {
        recipients,
        total: recipients.length
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error fetching email recipients:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch recipients' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
