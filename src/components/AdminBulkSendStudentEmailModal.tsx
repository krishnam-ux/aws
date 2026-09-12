'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DEFAULT_EMAIL_TEMPLATES,
  interpolateVariables,
  renderEmailLayout
} from '@/lib/email/templates';
import { getSenderForEmailType } from '@/lib/email/senders';
import { EmailType, EmailBatchSummary } from '@/types/email';

export interface EventRegistration {
  id: string;
  eventId: string;
  eventName: string;
  name: string;
  email: string;
  phone?: string;
  university?: string;
  program?: string;
  year?: string;
  studentId?: string;
  status: string;
  date: string;
  certificateId?: string | null;
  notes?: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  date?: string;
  time?: string;
  venue?: string;
  mode?: string;
  status?: string;
}

interface AdminBulkSendStudentEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRegistrationIds: string[];
  registrations: EventRegistration[];
  events: CommunityEvent[];
  token?: string | null;
  onBatchComplete?: (summary: EmailBatchSummary) => void;
}

export type EmailPurposeOption =
  | 'event_registration_confirmation'
  | 'event_24h_reminder'
  | 'event_1h_reminder'
  | 'event_updated'
  | 'event_cancelled'
  | 'event_important_info'
  | 'event_starting_soon'
  | 'event_feedback_request'
  | 'event_certificate_available'
  | 'admin_manual_message'
  | 'custom_message';

interface PurposeDefinition {
  key: EmailPurposeOption;
  label: string;
  description: string;
  templateType: EmailType;
  category: 'EVENTS' | 'COMMUNITY' | 'ADMIN';
  defaultSender: string;
}

const EMAIL_PURPOSE_OPTIONS: PurposeDefinition[] = [
  {
    key: 'event_registration_confirmation',
    label: 'Registration Confirmation',
    description: 'Official confirmation receipt with date, venue, and registration badge.',
    templateType: 'event_registration_confirmation',
    category: 'EVENTS',
    defaultSender: 'events@awssbgcuup.tech'
  },
  {
    key: 'event_24h_reminder',
    label: 'Event Reminder – 24 Hours',
    description: 'Scheduled reminder sent 24 hours before the event commencement.',
    templateType: 'event_24h_reminder',
    category: 'EVENTS',
    defaultSender: 'events@awssbgcuup.tech'
  },
  {
    key: 'event_1h_reminder',
    label: 'Event Reminder – 1 Hour',
    description: 'Urgent gate opening notice sent 1 hour prior to session start.',
    templateType: 'event_1h_reminder',
    category: 'EVENTS',
    defaultSender: 'events@awssbgcuup.tech'
  },
  {
    key: 'event_updated',
    label: 'Event Updated / Rescheduled',
    description: 'Notice regarding modified timing, venue change, or updated agenda.',
    templateType: 'event_updated',
    category: 'EVENTS',
    defaultSender: 'events@awssbgcuup.tech'
  },
  {
    key: 'event_cancelled',
    label: 'Event Cancelled',
    description: 'Polite cancellation notice and invitation to explore upcoming events.',
    templateType: 'event_cancelled',
    category: 'EVENTS',
    defaultSender: 'events@awssbgcuup.tech'
  },
  {
    key: 'event_important_info',
    label: 'Important Event Information',
    description: 'Crucial instructions, prerequisite setups, or room entry guidelines.',
    templateType: 'admin_manual_message',
    category: 'EVENTS',
    defaultSender: 'events@awssbgcuup.tech'
  },
  {
    key: 'event_starting_soon',
    label: 'Event Starting Soon',
    description: 'Final call for attendees to take their seats at the session venue.',
    templateType: 'event_starting_soon',
    category: 'EVENTS',
    defaultSender: 'events@awssbgcuup.tech'
  },
  {
    key: 'event_feedback_request',
    label: 'Feedback Request',
    description: 'Post-event survey invitation to collect ratings and suggestions.',
    templateType: 'event_feedback_request',
    category: 'EVENTS',
    defaultSender: 'events@awssbgcuup.tech'
  },
  {
    key: 'event_certificate_available',
    label: 'Certificate / Achievement Update',
    description: 'Official digital participation certificate verification & download link.',
    templateType: 'event_certificate_available',
    category: 'EVENTS',
    defaultSender: 'events@awssbgcuup.tech'
  },
  {
    key: 'admin_manual_message',
    label: 'General Communication',
    description: 'Official community advisory, coordination message, or announcement.',
    templateType: 'admin_manual_message',
    category: 'ADMIN',
    defaultSender: 'communication@awssbgcuup.tech'
  },
  {
    key: 'custom_message',
    label: 'Custom Message',
    description: 'Compose custom subject and body copy with full branded layout wrapping.',
    templateType: 'admin_manual_message',
    category: 'ADMIN',
    defaultSender: 'events@awssbgcuup.tech'
  }
];

export default function AdminBulkSendStudentEmailModal({
  isOpen,
  onClose,
  selectedRegistrationIds,
  registrations,
  events,
  token,
  onBatchComplete
}: AdminBulkSendStudentEmailModalProps) {
  const [selectedPurpose, setSelectedPurpose] = useState<EmailPurposeOption>('event_registration_confirmation');
  const [subject, setSubject] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [batchSummary, setBatchSummary] = useState<EmailBatchSummary | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');

  // Filter selected registrations
  const selectedRegistrations = useMemo(() => {
    return registrations.filter((r) => selectedRegistrationIds.includes(r.id));
  }, [registrations, selectedRegistrationIds]);

  // Sample student for live preview rendering
  const sampleStudent = useMemo(() => {
    return selectedRegistrations[0] || null;
  }, [selectedRegistrations]);

  // Match sample event
  const sampleEvent = useMemo(() => {
    if (!sampleStudent) return null;
    return (
      events.find((e) => e.id === sampleStudent.eventId) ||
      events.find((e) => e.title === sampleStudent.eventName) ||
      null
    );
  }, [sampleStudent, events]);

  // Events summary in selection
  const eventsInSelection = useMemo(() => {
    const eventNames = Array.from(new Set(selectedRegistrations.map((r) => r.eventName || 'AWS Event').filter(Boolean)));
    return eventNames;
  }, [selectedRegistrations]);

  // Selected Purpose Definition
  const currentPurposeDef = useMemo(() => {
    return EMAIL_PURPOSE_OPTIONS.find((p) => p.key === selectedPurpose) || EMAIL_PURPOSE_OPTIONS[0];
  }, [selectedPurpose]);

  // Computed Sender
  const senderAddress = useMemo(() => {
    return getSenderForEmailType(currentPurposeDef.templateType, currentPurposeDef.category);
  }, [currentPurposeDef]);

  // Find Base Template
  const baseTemplate = useMemo(() => {
    return (
      DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === currentPurposeDef.templateType) ||
      DEFAULT_EMAIL_TEMPLATES[0]
    );
  }, [currentPurposeDef]);

  // Variables Map for Sample Student Preview
  const sampleVariablesMap = useMemo(() => {
    if (!sampleStudent) return {};
    const studentName = sampleStudent.name?.trim() || 'Student Name';
    const eventTitle = sampleEvent?.title || sampleStudent.eventName || 'AWS Cloud Event';
    const eventDate = sampleEvent?.date || 'September 25, 2026';
    const eventTime = (sampleEvent as any)?.time || '10:00 AM IST';
    const eventVenue = sampleEvent?.venue || 'Auditorium Block A, Chandigarh University – UP';
    const eventMode = (sampleEvent as any)?.mode || 'In-Person';
    const eventUrl = sampleEvent
      ? `https://www.awssbgcuup.tech/events/${sampleEvent.id}`
      : 'https://www.awssbgcuup.tech/events';

    return {
      studentName,
      fullName: studentName,
      name: studentName,
      recipientName: studentName,
      email: sampleStudent.email,
      eventTitle,
      eventName: eventTitle,
      eventDate,
      date: eventDate,
      eventTime,
      time: eventTime,
      eventVenue,
      venue: eventVenue,
      eventMode,
      mode: eventMode,
      registrationId: sampleStudent.id,
      eventUrl,
      updateNotes: customNotes || 'Schedule and location details have been updated.',
      cancellationReason: customNotes || 'Unforeseen scheduling constraints.',
      messageContent: customNotes || 'Important update regarding your workshop registration.',
      feedbackUrl: 'https://www.awssbgcuup.tech/feedback',
      certificateId: sampleStudent.certificateId || `AWS-SBG-${new Date().getFullYear()}-${sampleStudent.id.slice(-6).toUpperCase()}`,
      certificateUrl: 'https://www.awssbgcuup.tech/verification'
    };
  }, [sampleStudent, sampleEvent, customNotes]);

  // Reset form when purpose changes
  useEffect(() => {
    if (!isOpen) return;

    setShowConfirm(false);
    setBatchSummary(null);
    setSendError(null);

    if (selectedPurpose === 'event_important_info') {
      setSubject(`Important Information: ${eventsInSelection[0] || 'AWS Cloud Event'}`);
      setCustomNotes('Please arrive 15 minutes before the session start time. Bring your Student ID card and laptop.');
    } else if (selectedPurpose === 'custom_message') {
      setSubject(`Notification: ${eventsInSelection[0] || 'AWS Cloud Event'}`);
      setCustomNotes('Dear student, this is an official message from the AWS SBG CU-UP Team regarding your session.');
    } else {
      const defaultSubj = interpolateVariables(baseTemplate.subject, sampleVariablesMap);
      setSubject(defaultSubj);
      setCustomNotes('');
    }
  }, [selectedPurpose, isOpen, baseTemplate, eventsInSelection, sampleVariablesMap]);

  // Sample Rendered HTML for Preview Tab
  const { renderedSampleSubject, renderedSampleHtml } = useMemo(() => {
    if (!sampleStudent) {
      return { renderedSampleSubject: '', renderedSampleHtml: '' };
    }

    let rawBodyHtml = baseTemplate.bodyHtml;

    if (selectedPurpose === 'event_important_info' || selectedPurpose === 'custom_message') {
      rawBodyHtml = `<!-- HERO SECTION -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#090E1A" style="background: linear-gradient(180deg, #090E1A 0%, #111A2E 100%); padding: 32px 28px; border-bottom: 1px solid #1E293B;">
  <tr>
    <td align="left" valign="top">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #FF9900; text-transform: uppercase; margin-bottom: 8px;">
        OFFICIAL EVENT ADVISORY
      </div>
      <h1 class="hero-title-mobile" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 800; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.5px;">
        Important <span style="color: #FF9900;">Notice</span>
      </h1>
      <div style="font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Dear {{studentName}},
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #CBD5E1; max-width: 480px;">
        Please review this important announcement regarding <strong>{{eventTitle}}</strong>.
      </div>
    </td>
  </tr>
</table>

<!-- LIGHT CARD CONTAINER -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 28px 24px;">
  <tr>
    <td>
      <!-- MESSAGE CARD -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 24px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 14px; color: #0F172A; line-height: 1.7; white-space: pre-wrap;">
{{messageContent}}
            </div>
          </td>
        </tr>
      </table>

      <!-- EVENT DETAILS SUMMARY -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#FFF7ED" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <tr>
          <td>
            <div style="font-size: 12px; font-weight: 800; color: #9A3412; margin-bottom: 6px;">
              Session Reference
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.5;">
              <strong>Event:</strong> {{eventTitle}}<br />
              <strong>Registration ID:</strong> {{registrationId}}<br />
              <strong>Venue:</strong> {{eventVenue}}
            </div>
          </td>
        </tr>
      </table>

      <!-- PRIMARY CTA BUTTON -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 12px; margin-bottom: 18px;">
        <tr>
          <td align="center">
            <a href="{{eventUrl}}" target="_blank" class="btn-cta-primary" style="display: inline-block; background-color: #FF9900; background: linear-gradient(135deg, #FF9900 0%, #EA580C 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 153, 0, 0.35); text-align: center;">
              View Event Portal &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
    }

    const currentSubj = subject || baseTemplate.subject;
    const finalSubject = interpolateVariables(currentSubj, sampleVariablesMap);
    const interpolatedBodyHtml = interpolateVariables(rawBodyHtml, sampleVariablesMap);

    const fullHtml = renderEmailLayout({
      title: finalSubject,
      contentHtml: interpolatedBodyHtml
    });

    return {
      renderedSampleSubject: finalSubject,
      renderedSampleHtml: fullHtml
    };
  }, [sampleStudent, baseTemplate, selectedPurpose, subject, customNotes, sampleVariablesMap]);

  if (!isOpen || selectedRegistrationIds.length === 0) return null;

  // Filtered recipients for search within modal
  const displayedRecipients = selectedRegistrations.filter((r) => {
    if (!recipientSearchQuery.trim()) return true;
    const q = recipientSearchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
  });

  // Execute Bulk Send
  const handleExecuteBulkSend = async (targetIds?: string[]) => {
    const idsToSend = targetIds || selectedRegistrationIds;
    if (idsToSend.length === 0 || isSending) return;

    setIsSending(true);
    setSendError(null);

    const effectiveToken =
      token ||
      (typeof window !== 'undefined'
        ? sessionStorage.getItem('adminToken') ||
          localStorage.getItem('admin_token') ||
          sessionStorage.getItem('admin_token')
        : null) ||
      'awssbg-admin-session-token-secure-hash';

    try {
      const response = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveToken}`
        },
        body: JSON.stringify({
          mode: 'registration_batch',
          registrationIds: idsToSend,
          purpose: currentPurposeDef.label,
          type: currentPurposeDef.templateType,
          subject: subject.trim(),
          customNotes: customNotes.trim(),
          templateId: baseTemplate.id,
          adminId: 'admin'
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.summary) {
        setBatchSummary(data.summary);
        setShowConfirm(false);
        if (onBatchComplete) {
          onBatchComplete(data.summary);
        }
      } else {
        setSendError(data.error || 'Failed to complete bulk email dispatch.');
      }
    } catch (err: any) {
      setSendError(err.message || 'Network error occurred connecting to email service.');
    } finally {
      setIsSending(false);
      setIsRetrying(false);
    }
  };

  // Retry Failed Recipients
  const handleRetryFailed = () => {
    if (!batchSummary || batchSummary.errors.length === 0) return;
    const failedIds = batchSummary.errors
      .map((e: any) => e.registrationId)
      .filter((id): id is string => Boolean(id));

    if (failedIds.length > 0) {
      setIsRetrying(true);
      handleExecuteBulkSend(failedIds);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs font-sans text-xs">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-[#0B0F17] text-white border-b border-[#1E293B] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF9900]/20 border border-[#FF9900]/40 flex items-center justify-center text-base">
              📨
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <span>Bulk Send Email to Students</span>
                <span className="bg-[#FF9900] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                  {selectedRegistrationIds.length} Selected
                </span>
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Centralized Resend Email Engine &bull; Server-Side Dynamic Personalization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">

          {/* 1. SELECTION SUMMARY & RECIPIENTS BAR */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Target Recipients Overview
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {selectedRegistrationIds.length} Recipient{selectedRegistrationIds.length === 1 ? '' : 's'}
                </span>
                {eventsInSelection.length > 0 && (
                  <span className="text-[10px] font-semibold text-slate-600 truncate max-w-xs">
                    &bull; Event: <strong className="text-slate-900">{eventsInSelection.join(', ')}</strong>
                  </span>
                )}
              </div>

              <input
                type="text"
                placeholder="Filter selected..."
                value={recipientSearchQuery}
                onChange={(e) => setRecipientSearchQuery(e.target.value)}
                className="px-2.5 py-1 border border-[#E2E8F0] rounded bg-white text-[11px] focus:outline-none focus:ring-1 focus:ring-[#FF9900] w-48"
              />
            </div>

            {/* Recipients Scrollable Tag List */}
            <div className="max-h-24 overflow-y-auto border border-slate-200 rounded-md p-2 bg-white flex flex-wrap gap-1.5 shadow-inner">
              {displayedRecipients.map((reg) => (
                <span
                  key={reg.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-800"
                  title={`${reg.name} (${reg.email})`}
                >
                  <span className="font-semibold text-slate-900">{reg.name}</span>
                  <span className="text-slate-400 font-mono text-[9px]">&lt;{reg.email}&gt;</span>
                </span>
              ))}
              {displayedRecipients.length === 0 && (
                <span className="text-[11px] text-slate-400 py-1">No recipients matching query.</span>
              )}
            </div>
          </div>

          {/* 2. BATCH DELIVERY SUMMARY BANNER (After Send) */}
          {batchSummary && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🎉</span>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-900">Bulk Email Dispatch Completed</h4>
                    <p className="text-xs text-emerald-700">
                      All messages processed and logged in Email Center audit trail.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white px-2.5 py-1 rounded border border-emerald-200 text-emerald-800">
                  Batch: {batchSummary.batchId}
                </span>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 bg-white rounded-md border border-emerald-200">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Total</span>
                  <span className="text-base font-extrabold text-slate-900">{batchSummary.total}</span>
                </div>
                <div className="p-2.5 bg-white rounded-md border border-emerald-200">
                  <span className="text-[9px] uppercase font-bold text-emerald-700 block">Successfully Sent</span>
                  <span className="text-base font-extrabold text-emerald-600">{batchSummary.sent}</span>
                </div>
                <div className="p-2.5 bg-white rounded-md border border-emerald-200">
                  <span className="text-[9px] uppercase font-bold text-red-600 block">Failed</span>
                  <span className={`text-base font-extrabold ${batchSummary.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {batchSummary.failed}
                  </span>
                </div>
              </div>

              {/* Failed Items List & Retry Action */}
              {batchSummary.failed > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-900 text-[11px] uppercase tracking-wider">
                      Failed Recipient Errors ({batchSummary.failed})
                    </span>
                    <button
                      type="button"
                      disabled={isSending || isRetrying}
                      onClick={handleRetryFailed}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isRetrying ? 'Retrying Failed...' : '🔄 Retry Failed Recipients'}
                    </button>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[10px]">
                    {batchSummary.errors.map((err: any, idx) => (
                      <div key={idx} className="text-red-800 bg-white/80 p-1.5 rounded border border-red-100 flex justify-between">
                        <span><strong>{err.name || err.recipient}:</strong> {err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. SEND ERROR BANNER */}
          {sendError && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-900 space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-base">⚠️</span>
                <span className="font-bold text-sm">Bulk Dispatch Error</span>
              </div>
              <p className="text-xs">{sendError}</p>
            </div>
          )}

          {/* 4. TABS: COMPOSE VS SAMPLE PREVIEW */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                className={`px-3.5 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'compose'
                    ? 'bg-[#0B0F17] text-white'
                    : 'bg-[#F1F5F9] text-slate-700 hover:bg-slate-200'
                }`}
              >
                ✏️ Compose &amp; Purpose
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3.5 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-[#0B0F17] text-white'
                    : 'bg-[#F1F5F9] text-slate-700 hover:bg-slate-200'
                }`}
              >
                👁️ Sample Render Preview
              </button>
            </div>

            <div className="text-[11px] text-[#64748B] flex items-center space-x-2">
              <span>Sender Identity:</span>
              <span className="font-mono font-semibold text-[#0F172A] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {senderAddress}
              </span>
            </div>
          </div>

          {/* TAB 1: COMPOSE */}
          {activeTab === 'compose' && (
            <div className="space-y-4">
              
              {/* Purpose Selection */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                  Email Purpose / Template
                </label>
                <select
                  value={selectedPurpose}
                  onChange={(e) => setSelectedPurpose(e.target.value as EmailPurposeOption)}
                  disabled={isSending || Boolean(batchSummary)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded font-medium text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-white cursor-pointer"
                >
                  {EMAIL_PURPOSE_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label} &mdash; {opt.description}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#64748B]">
                  {currentPurposeDef.description}
                </p>
              </div>

              {/* Subject Line */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isSending || Boolean(batchSummary)}
                  required
                  placeholder="Subject line..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>

              {/* Optional Custom Notes / Update Details */}
              {(selectedPurpose === 'event_updated' ||
                selectedPurpose === 'event_cancelled' ||
                selectedPurpose === 'event_important_info' ||
                selectedPurpose === 'custom_message') && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                    {selectedPurpose === 'event_updated'
                      ? 'Update / Reschedule Notes'
                      : selectedPurpose === 'event_cancelled'
                      ? 'Reason for Cancellation'
                      : 'Custom Message Content'}
                  </label>
                  <textarea
                    rows={4}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    disabled={isSending || Boolean(batchSummary)}
                    placeholder="Enter custom instructions or announcements for selected students..."
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] leading-relaxed font-sans"
                  />
                </div>
              )}

              {/* Dynamic Personalization Guarantee Banner */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-1.5 text-[11px] text-amber-950">
                <span className="font-bold block flex items-center gap-1 text-amber-900">
                  <span>✨</span>
                  <span>Individual Personalization Guarantee</span>
                </span>
                <p className="leading-relaxed">
                  Each student will receive an individual email addressed to them (e.g. <strong>Dear {sampleStudent?.name || 'Student Name'},</strong>) with their specific registration ID, correct event details, and personalized badges. No unresolved curly braces will be sent.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>
                  Sample Preview for: <strong className="text-[#111827]">{sampleStudent?.name}</strong> ({sampleStudent?.email})
                </span>
                <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                  Branded HTML Layout
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 max-h-[460px] overflow-y-auto shadow-inner">
                <iframe
                  title="Branded Bulk Email Sample Preview"
                  srcDoc={renderedSampleHtml}
                  className="w-full h-[450px] border-none bg-white"
                />
              </div>
            </div>
          )}

          {/* 5. CONFIRMATION OVERLAY */}
          {showConfirm && (
            <div className="p-4 bg-orange-50 border border-[#FF9900] rounded-lg space-y-3 animate-in fade-in">
              <div className="flex items-start space-x-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <h4 className="font-bold text-xs text-[#111827]">
                    Send this email to {selectedRegistrationIds.length} selected student{selectedRegistrationIds.length === 1 ? '' : 's'}?
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Sender: <span className="font-mono font-semibold text-slate-900">{senderAddress}</span> &bull; Purpose: <strong className="text-[#FF9900]">{currentPurposeDef.label}</strong>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Emails will be individually personalized and dispatched through the Resend centralized provider.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-orange-200">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => handleExecuteBulkSend()}
                  className="px-4 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-xs cursor-pointer transition-all flex items-center space-x-1.5"
                >
                  <span>{isSending ? 'Dispatching Batch...' : `🚀 Confirm & Send to ${selectedRegistrationIds.length} Students`}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 border border-[#E2E8F0] hover:bg-slate-100 text-slate-700 text-xs font-bold rounded transition-colors cursor-pointer disabled:opacity-50"
          >
            {batchSummary ? 'Done / Close' : 'Cancel'}
          </button>

          <div className="flex items-center space-x-2">
            {activeTab === 'compose' ? (
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                disabled={isSending}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                Preview Sample
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                disabled={isSending}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                Edit Purpose &amp; Notes
              </button>
            )}

            {!batchSummary && !showConfirm && (
              <button
                type="button"
                disabled={isSending || selectedRegistrationIds.length === 0}
                onClick={() => setShowConfirm(true)}
                className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
              >
                <span>✉️ Send Email to Selected ({selectedRegistrationIds.length})</span>
              </button>
            )}

            {batchSummary && (
              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                <span>✓</span>
                <span>Batch Sent ({batchSummary.sent}/{batchSummary.total})</span>
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
