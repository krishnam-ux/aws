import { db } from '@/lib/db';
import { sendTemplateEmail } from './service';
import { EmailType, EmailAutomationSetting } from '@/types/email';

export const DEFAULT_AUTOMATION_SETTINGS: EmailAutomationSetting[] = [
  // 1. Events
  {
    id: 'auto-event-reg-confirm',
    category: 'EVENTS',
    eventType: 'event_registration_confirmation',
    title: 'Event Registration Confirmation',
    description: 'Triggered immediately when a student registers for a published event.',
    isEnabled: true,
    defaultTemplateId: 'tpl-event_registration_confirmation',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-event-24h-reminder',
    category: 'EVENTS',
    eventType: 'event_24h_reminder',
    title: 'Event 24-Hour Reminder',
    description: 'Scheduled broadcast 24 hours prior to event start.',
    isEnabled: true,
    defaultTemplateId: 'tpl-event_24h_reminder',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-event-1h-reminder',
    category: 'EVENTS',
    eventType: 'event_1h_reminder',
    title: 'Event 1-Hour Reminder',
    description: 'Scheduled urgent broadcast 1 hour prior to event start.',
    isEnabled: true,
    defaultTemplateId: 'tpl-event_1h_reminder',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-event-updated',
    category: 'EVENTS',
    eventType: 'event_updated',
    title: 'Event Details Updated',
    description: 'Sent when venue, schedule, or prerequisites are modified.',
    isEnabled: true,
    defaultTemplateId: 'tpl-event_updated',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-event-cancelled',
    category: 'EVENTS',
    eventType: 'event_cancelled',
    title: 'Event Cancellation Alert',
    description: 'Dispatched if an event is cancelled by administrators.',
    isEnabled: true,
    defaultTemplateId: 'tpl-event_cancelled',
    updatedAt: new Date().toISOString()
  },
  // 2. Opportunities / Careers
  {
    id: 'auto-opp-app-received',
    category: 'OPPORTUNITIES',
    eventType: 'opportunity_application_received',
    title: 'Application Received Acknowledgment',
    description: 'Dispatched to applicants immediately upon submitting an opportunity application.',
    isEnabled: true,
    defaultTemplateId: 'tpl-opportunity_application_received',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-opp-shortlisted',
    category: 'OPPORTUNITIES',
    eventType: 'opportunity_shortlisted',
    title: 'Candidate Shortlisted Notification',
    description: 'Sent when Admin marks application as Shortlisted for interview.',
    isEnabled: true,
    defaultTemplateId: 'tpl-opportunity_shortlisted',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-opp-selected',
    category: 'OPPORTUNITIES',
    eventType: 'opportunity_selected',
    title: 'Official Selection & Offer',
    description: 'Sent when candidate is accepted into the AWS SBG Core Team.',
    isEnabled: true,
    defaultTemplateId: 'tpl-opportunity_selected',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-opp-rejected',
    category: 'OPPORTUNITIES',
    eventType: 'opportunity_rejected',
    title: 'Application Regret Notification',
    description: 'Polite notice dispatched if candidate is not selected.',
    isEnabled: true,
    defaultTemplateId: 'tpl-opportunity_rejected',
    updatedAt: new Date().toISOString()
  },
  // 3. Exams
  {
    id: 'auto-exam-credentials',
    category: 'EXAMS',
    eventType: 'exam_instructions',
    title: 'Exam Credentials & Instructions',
    description: 'Dispatched to verified candidates with Exam Code and Access Password.',
    isEnabled: true,
    defaultTemplateId: 'tpl-exam_instructions',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-exam-submitted',
    category: 'EXAMS',
    eventType: 'exam_submitted_confirmation',
    title: 'Exam Submitted Confirmation',
    description: 'Official receipt confirming exam submission without score leakage.',
    isEnabled: true,
    defaultTemplateId: 'tpl-exam_submitted_confirmation',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-exam-result',
    category: 'EXAMS',
    eventType: 'exam_result',
    title: 'Official Assessment Result Scorecard',
    description: 'Direct candidate scorecard email containing score, percentage, and verdict.',
    isEnabled: true,
    defaultTemplateId: 'tpl-exam_result',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-exam-selected',
    category: 'EXAMS',
    eventType: 'exam_selected_qualified',
    title: 'Candidate Selected / Qualified Alert',
    description: 'Dispatched when Admin marks candidate as selected from proctor console.',
    isEnabled: true,
    defaultTemplateId: 'tpl-exam_selected_qualified',
    updatedAt: new Date().toISOString()
  },
  // 4. Feedback
  {
    id: 'auto-feedback-received',
    category: 'COMMUNITY',
    eventType: 'feedback_received_acknowledgement',
    title: 'Feedback Received Receipt',
    description: 'Dispatched to students after submitting feedback on events.',
    isEnabled: true,
    defaultTemplateId: 'tpl-feedback_received_acknowledgement',
    updatedAt: new Date().toISOString()
  }
];

/**
 * Checks if a specific automated email trigger is currently enabled in settings.
 */
export async function isAutomationEnabled(eventType: EmailType): Promise<boolean> {
  try {
    const setting = await db.emailAutomationSettings.getByType(eventType);
    if (!setting) return true; // Enabled by default
    return Boolean(setting.isEnabled);
  } catch {
    return true;
  }
}

/* =========================================================================
   1. EVENT AUTOMATIONS
========================================================================= */

/**
 * Trigger: Event Registration Confirmation
 */
export async function triggerEventRegistrationConfirmation(params: {
  studentName: string;
  email: string;
  event: {
    id: string;
    title: string;
    date: string;
    time?: string;
    venue?: string;
    mode?: string;
  };
  registrationId?: string;
}) {
  const { studentName, email, event, registrationId } = params;
  if (!email || !(await isAutomationEnabled('event_registration_confirmation'))) {
    return;
  }

  const variables = {
    studentName,
    eventTitle: event.title,
    eventDate: event.date || 'TBA',
    eventTime: event.time || 'TBA',
    eventVenue: event.venue || 'Chandigarh University – Uttar Pradesh',
    eventMode: event.mode || 'In-Person',
    registrationId,
    eventUrl: `https://www.awssbgcuup.tech/events/${event.id}`
  };

  return await sendTemplateEmail({
    type: 'event_registration_confirmation',
    to: email,
    variables,
    ctaText: 'View Event Details',
    ctaUrl: variables.eventUrl
  });
}

/**
 * Trigger: Event 24h or 1h Reminder
 */
export async function triggerEventReminder(params: {
  studentName: string;
  email: string;
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    venue: string;
  };
  type: 'event_24h_reminder' | 'event_1h_reminder';
}) {
  const { studentName, email, event, type } = params;
  if (!email || !(await isAutomationEnabled(type))) {
    return;
  }

  const variables = {
    studentName,
    eventTitle: event.title,
    eventDate: event.date,
    eventTime: event.time,
    eventVenue: event.venue,
    eventUrl: `https://www.awssbgcuup.tech/events/${event.id}`
  };

  return await sendTemplateEmail({
    type,
    to: email,
    variables,
    ctaText: 'Event Information',
    ctaUrl: variables.eventUrl
  });
}

/**
 * Trigger: Event Updated / Rescheduled
 */
export async function triggerEventUpdated(params: {
  studentName: string;
  email: string;
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    venue: string;
  };
  updateNotes?: string;
}) {
  const { studentName, email, event, updateNotes } = params;
  if (!email || !(await isAutomationEnabled('event_updated'))) {
    return;
  }

  const variables = {
    studentName,
    eventTitle: event.title,
    eventDate: event.date,
    eventTime: event.time,
    eventVenue: event.venue,
    updateNotes: updateNotes || 'Schedule and location details have been updated.',
    eventUrl: `https://www.awssbgcuup.tech/events/${event.id}`
  };

  return await sendTemplateEmail({
    type: 'event_updated',
    to: email,
    variables,
    ctaText: 'Check Updated Schedule',
    ctaUrl: variables.eventUrl
  });
}

/**
 * Trigger: Event Cancelled
 */
export async function triggerEventCancelled(params: {
  studentName: string;
  email: string;
  event: {
    id: string;
    title: string;
  };
  reason?: string;
}) {
  const { studentName, email, event, reason } = params;
  if (!email || !(await isAutomationEnabled('event_cancelled'))) {
    return;
  }

  const variables = {
    studentName,
    eventTitle: event.title,
    cancellationReason: reason || 'Unforeseen scheduling constraints.',
    eventUrl: 'https://www.awssbgcuup.tech/events'
  };

  return await sendTemplateEmail({
    type: 'event_cancelled',
    to: email,
    variables
  });
}

/* =========================================================================
   2. CAREER / OPPORTUNITY AUTOMATIONS
========================================================================= */

/**
 * Trigger: Opportunity Application Received
 */
export async function triggerOpportunityApplicationReceived(params: {
  studentName: string;
  email: string;
  opportunity: {
    id: string;
    title: string;
    role?: string;
    slug?: string;
  };
  applicationId: string;
}) {
  const { studentName, email, opportunity, applicationId } = params;
  if (!email || !(await isAutomationEnabled('opportunity_application_received'))) {
    return;
  }

  const variables = {
    studentName,
    opportunityTitle: opportunity.title,
    role: opportunity.role || opportunity.title,
    applicationId,
    opportunityUrl: `https://www.awssbgcuup.tech/opportunities/${opportunity.slug || opportunity.id}`
  };

  return await sendTemplateEmail({
    type: 'opportunity_application_received',
    to: email,
    variables,
    ctaText: 'View Opportunity',
    ctaUrl: variables.opportunityUrl
  });
}

/**
 * Trigger: Opportunity Status Change (Shortlisted, Selected, Rejected)
 */
export async function triggerOpportunityStatusChange(params: {
  studentName: string;
  email: string;
  opportunityTitle: string;
  status: 'Shortlisted' | 'Selected' | 'Rejected';
  notes?: string;
}) {
  const { studentName, email, opportunityTitle, status, notes } = params;
  let type: EmailType = 'opportunity_under_review';
  if (status === 'Shortlisted') type = 'opportunity_shortlisted';
  if (status === 'Selected') type = 'opportunity_selected';
  if (status === 'Rejected') type = 'opportunity_rejected';

  if (!email || !(await isAutomationEnabled(type))) {
    return;
  }

  const variables = {
    studentName,
    opportunityTitle,
    nextSteps: notes || 'Check your student inbox for scheduling instructions.',
    onboardingNotes: notes || 'Welcome to the team! Our leadership will connect with you soon.',
    opportunityUrl: 'https://www.awssbgcuup.tech/opportunities'
  };

  return await sendTemplateEmail({
    type,
    to: email,
    variables
  });
}

/* =========================================================================
   3. CERTIFICATION EXAM AUTOMATIONS
========================================================================= */

/**
 * Trigger: Exam Credentials & Entry Instructions
 */
export async function triggerExamCredentialsEmail(params: {
  studentName: string;
  email: string;
  exam: {
    id: string;
    title: string;
    examCode: string;
    password?: string;
    durationMinutes: number;
  };
}) {
  const { studentName, email, exam } = params;
  if (!email || !(await isAutomationEnabled('exam_instructions'))) {
    return;
  }

  const variables = {
    studentName,
    examName: exam.title,
    examCode: exam.examCode,
    examPassword: exam.password || 'TBA',
    durationMinutes: exam.durationMinutes,
    examUrl: `https://www.awssbgcuup.tech/exam/${exam.id}`
  };

  return await sendTemplateEmail({
    type: 'exam_instructions',
    to: email,
    variables,
    ctaText: 'Enter Exam Lobby',
    ctaUrl: variables.examUrl
  });
}

/**
 * Trigger: Exam Submitted Successfully
 * Strictly acknowledges submission without revealing scores on website.
 */
export async function triggerExamSubmissionConfirmation(params: {
  studentName: string;
  email: string;
  rollNumber: string;
  examTitle: string;
}) {
  const { studentName, email, rollNumber, examTitle } = params;
  if (!email || !(await isAutomationEnabled('exam_submitted_confirmation'))) {
    return;
  }

  const variables = {
    studentName,
    examName: examTitle,
    rollNumber,
    submittedAt: new Date().toLocaleTimeString()
  };

  return await sendTemplateEmail({
    type: 'exam_submitted_confirmation',
    to: email,
    variables
  });
}

/**
 * Trigger: Exam Result Scorecard Delivery (EMAIL ONLY)
 * Delivers evaluated score, percentage, and PASS/FAIL verdict to candidate.
 */
export async function triggerExamResultEmail(params: {
  studentName: string;
  email: string;
  rollNumber: string;
  exam: {
    id: string;
    title: string;
    examCode?: string;
    passingPercentage?: number;
  };
  result: {
    score: number;
    totalMarks: number;
    percentage: number;
    passed: boolean;
  };
}) {
  const { studentName, email, rollNumber, exam, result } = params;
  if (!email || !(await isAutomationEnabled('exam_result'))) {
    return;
  }

  const verdict = result.passed ? 'PASSED' : 'FAILED';
  const verdictColor = result.passed ? '#10B981' : '#F43F5E';

  const variables = {
    studentName,
    examName: exam.title,
    examCode: exam.examCode || 'EXAM',
    rollNumber,
    score: result.score,
    totalMarks: result.totalMarks,
    percentage: result.percentage,
    verdict,
    verdictColor,
    passingPercentage: exam.passingPercentage || 60
  };

  return await sendTemplateEmail({
    type: 'exam_result',
    to: email,
    variables
  });
}

/**
 * Trigger: Candidate Selected in Exam
 */
export async function triggerExamSelectionEmail(params: {
  studentName: string;
  email: string;
  rollNumber: string;
  exam: {
    id: string;
    title: string;
  };
  selectionNotes?: string;
}) {
  const { studentName, email, rollNumber, exam, selectionNotes } = params;
  if (!email || !(await isAutomationEnabled('exam_selected_qualified'))) {
    return;
  }

  const variables = {
    studentName,
    email,
    rollNumber,
    examName: exam.title,
    selectionNotes: selectionNotes || 'Selected & Qualified by Proctor'
  };

  return await sendTemplateEmail({
    type: 'exam_selected_qualified',
    to: email,
    variables
  });
}

/* =========================================================================
   4. COMMUNITY & FEEDBACK AUTOMATIONS
========================================================================= */

/**
 * Trigger: Feedback Received Acknowledgement
 */
export async function triggerFeedbackReceivedEmail(params: {
  studentName: string;
  email: string;
  category: string;
  message: string;
}) {
  const { studentName, email, category, message } = params;
  if (!email || !(await isAutomationEnabled('feedback_received_acknowledgement'))) {
    return;
  }

  const variables = {
    studentName: studentName || 'Community Builder',
    category: category || 'Community Feedback',
    messageSummary: message.length > 120 ? message.substring(0, 117) + '...' : message
  };

  return await sendTemplateEmail({
    type: 'feedback_received_acknowledgement',
    to: email,
    variables
  });
}
