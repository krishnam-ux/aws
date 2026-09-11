import { EmailAutomationSetting } from '@/types/email';

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
