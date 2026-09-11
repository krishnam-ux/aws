import { db } from '@/lib/db';
import { EmailAutomationSetting, EmailType } from '@/types/email';
import { sendTemplateEmail } from './index';

export const DEFAULT_AUTOMATION_SETTINGS: EmailAutomationSetting[] = [
  // Events
  {
    id: 'auto-event-reg-confirm',
    category: 'EVENTS',
    eventType: 'event_registration_confirmation',
    title: 'Event Registration Confirmation',
    description: 'Send confirmation email immediately upon student registering for any event.',
    isEnabled: true,
    defaultTemplateId: 'tpl-event-reg-confirm',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-event-24h-reminder',
    category: 'EVENTS',
    eventType: 'event_24h_reminder',
    title: 'Event 24-Hour Reminder',
    description: 'Send reminder email to registered attendees 24 hours before event starts.',
    isEnabled: true,
    defaultTemplateId: 'tpl-event-24h-reminder',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-event-1h-reminder',
    category: 'EVENTS',
    eventType: 'event_1h_reminder',
    title: 'Event 1-Hour Reminder',
    description: 'Send quick reminder with entry instructions 1 hour prior to session.',
    isEnabled: true,
    defaultTemplateId: 'tpl-event-24h-reminder',
    updatedAt: new Date().toISOString()
  },

  // Opportunities
  {
    id: 'auto-opp-received',
    category: 'OPPORTUNITIES',
    eventType: 'opportunity_application_received',
    title: 'Opportunity Application Received',
    description: 'Send acknowledgement with reference ID upon candidate application submission.',
    isEnabled: true,
    defaultTemplateId: 'tpl-opp-received',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-opp-shortlisted',
    category: 'OPPORTUNITIES',
    eventType: 'opportunity_shortlisted',
    title: 'Candidate Shortlisted Notification',
    description: 'Send notification when applicant is marked shortlisted by reviewers.',
    isEnabled: true,
    defaultTemplateId: 'tpl-opp-received',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-opp-selected',
    category: 'OPPORTUNITIES',
    eventType: 'opportunity_selected',
    title: 'Candidate Selected Notification',
    description: 'Send official selection letter and onboarding instructions.',
    isEnabled: true,
    defaultTemplateId: 'tpl-opp-received',
    updatedAt: new Date().toISOString()
  },

  // Certification Exams
  {
    id: 'auto-exam-result',
    category: 'EXAMS',
    eventType: 'exam_result',
    title: 'Exam Scorecard & Result Delivery',
    description: 'Dispatch official evaluation scorecard and Pass/Fail verdict after server-side grading.',
    isEnabled: true,
    defaultTemplateId: 'tpl-exam-result',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'auto-exam-selected',
    category: 'EXAMS',
    eventType: 'exam_selected_qualified',
    title: 'Proctor Candidate Qualification Email',
    description: 'Dispatch official selection notification when Proctor qualifies candidate in Live Monitor.',
    isEnabled: true,
    defaultTemplateId: 'tpl-exam-selected',
    updatedAt: new Date().toISOString()
  },

  // Feedback & Community
  {
    id: 'auto-feedback-ack',
    category: 'COMMUNITY',
    eventType: 'feedback_received_acknowledgement',
    title: 'Feedback Received Acknowledgement',
    description: 'Acknowledge community suggestions and feedback submissions.',
    isEnabled: true,
    defaultTemplateId: 'tpl-feedback-ack',
    updatedAt: new Date().toISOString()
  }
];

/**
 * Checks if a particular email automation trigger is currently enabled in settings
 */
export async function isAutomationEnabled(eventType: EmailType): Promise<boolean> {
  try {
    const settings = await db.emailAutomationSettings.getAll();
    const match = settings.find((s: any) => s.eventType === eventType);
    if (match) {
      return Boolean(match.isEnabled);
    }
    const defaultSetting = DEFAULT_AUTOMATION_SETTINGS.find((s) => s.eventType === eventType);
    return defaultSetting ? defaultSetting.isEnabled : true;
  } catch (err) {
    console.error(`Failed to check automation status for ${eventType}:`, err);
    return true; // fail-safe: allow essential transactional emails
  }
}

/**
 * Automated Trigger: Event Registration Confirmation
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
  if (!(await isAutomationEnabled('event_registration_confirmation'))) {
    console.log(`[Email Automation] event_registration_confirmation is disabled. Skipping ${email}.`);
    return;
  }

  const variables = {
    studentName: studentName || 'Student Builder',
    email,
    eventName: event.title,
    eventDate: event.date,
    eventTime: event.time || '10:00 AM IST',
    venue: event.venue || (event.mode === 'Online' ? 'Online / Virtual Platform' : 'Chandigarh University Campus'),
    registrationId: registrationId || `REG-${Date.now().toString().slice(-6)}`,
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
 * Automated Trigger: Opportunity Application Received
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
  applicationId?: string;
}) {
  const { studentName, email, opportunity, applicationId } = params;
  if (!(await isAutomationEnabled('opportunity_application_received'))) {
    console.log(`[Email Automation] opportunity_application_received is disabled. Skipping ${email}.`);
    return;
  }

  const variables = {
    studentName: studentName || 'Applicant',
    email,
    opportunityTitle: opportunity.title,
    role: opportunity.role || 'Core Team Member',
    applicationId: applicationId || `APP-${Date.now().toString().slice(-6)}`,
    opportunityUrl: `https://www.awssbgcuup.tech/opportunities/${opportunity.slug || opportunity.id}`
  };

  return await sendTemplateEmail({
    type: 'opportunity_application_received',
    to: email,
    variables,
    ctaText: 'View Opportunities',
    ctaUrl: variables.opportunityUrl
  });
}

/**
 * Automated Trigger: Exam Evaluation Result
 */
export async function triggerExamResultEmail(params: {
  studentName: string;
  email: string;
  rollNumber: string;
  exam: {
    id: string;
    title: string;
    examCode: string;
    passingPercentage: number;
  };
  result: {
    score: number;
    totalMarks: number;
    percentage: number;
    passed: boolean;
  };
}) {
  const { studentName, email, rollNumber, exam, result } = params;
  if (!(await isAutomationEnabled('exam_result'))) {
    console.log(`[Email Automation] exam_result is disabled. Skipping ${email}.`);
    return;
  }

  const verdict = result.passed ? 'PASSED' : 'FAILED';
  const verdictColor = result.passed ? '#10B981' : '#EF4444';

  const variables = {
    studentName,
    email,
    rollNumber,
    examName: exam.title,
    examCode: exam.examCode,
    score: result.score,
    totalMarks: result.totalMarks,
    percentage: result.percentage,
    verdict,
    verdictColor,
    passingPercentage: exam.passingPercentage
  };

  return await sendTemplateEmail({
    type: 'exam_result',
    to: email,
    variables
  });
}

/**
 * Automated Trigger: Candidate Selected in Exam
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
  if (!(await isAutomationEnabled('exam_selected_qualified'))) {
    console.log(`[Email Automation] exam_selected_qualified is disabled. Skipping ${email}.`);
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

/**
 * Automated Trigger: Feedback Received Acknowledgement
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
    studentName: studentName || 'Student Builder',
    feedbackCategory: category || 'General Feedback',
    feedbackMessage: message || 'Feedback received.'
  };

  return await sendTemplateEmail({
    type: 'feedback_received_acknowledgement',
    to: email,
    variables
  });
}
