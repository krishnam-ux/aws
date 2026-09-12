'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DEFAULT_EMAIL_TEMPLATES,
  interpolateVariables,
  renderEmailLayout
} from '@/lib/email/templates';
import { getSenderForEmailType } from '@/lib/email/senders';
import { EmailType } from '@/types/email';

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

interface AdminSendStudentEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: EventRegistration | null;
  events: CommunityEvent[];
  token?: string | null;
  onEmailSent?: (result: any) => void;
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

export default function AdminSendStudentEmailModal({
  isOpen,
  onClose,
  registration,
  events,
  token,
  onEmailSent
}: AdminSendStudentEmailModalProps) {
  const [selectedPurpose, setSelectedPurpose] = useState<EmailPurposeOption>('event_registration_confirmation');
  const [subject, setSubject] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    messageId?: string;
    error?: string;
    timestamp?: string;
  } | null>(null);
  const [isSent, setIsSent] = useState(false);

  // Match event from registration
  const matchingEvent = useMemo(() => {
    if (!registration) return null;
    return (
      events.find((e) => e.id === registration.eventId) ||
      events.find((e) => e.title === registration.eventName) ||
      null
    );
  }, [registration, events]);

  // Selected Purpose Definition
  const currentPurposeDef = useMemo(() => {
    return EMAIL_PURPOSE_OPTIONS.find((p) => p.key === selectedPurpose) || EMAIL_PURPOSE_OPTIONS[0];
  }, [selectedPurpose]);

  // Computed Sender
  const senderAddress = useMemo(() => {
    return getSenderForEmailType(currentPurposeDef.templateType, currentPurposeDef.category);
  }, [currentPurposeDef]);

  // Build Variables Map for Personalization
  const variablesMap = useMemo(() => {
    if (!registration) return {};
    const studentName = registration.name?.trim() || 'Student';
    const eventTitle = matchingEvent?.title || registration.eventName || 'AWS Cloud Event';
    const eventDate = matchingEvent?.date || 'TBA';
    const eventTime = (matchingEvent as any)?.time || '10:00 AM IST';
    const eventVenue = matchingEvent?.venue || 'Auditorium Block A, Chandigarh University – UP';
    const eventMode = (matchingEvent as any)?.mode || 'In-Person';
    const eventUrl = matchingEvent
      ? `https://www.awssbgcuup.tech/events/${matchingEvent.id}`
      : 'https://www.awssbgcuup.tech/events';

    return {
      studentName,
      fullName: studentName,
      name: studentName,
      recipientName: studentName,
      email: registration.email,
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
      registrationId: registration.id,
      eventUrl,
      updateNotes: customNotes || 'Schedule and location details have been updated.',
      cancellationReason: customNotes || 'Unforeseen scheduling constraints.',
      messageContent: customNotes || 'Important update regarding your workshop registration.',
      feedbackUrl: 'https://www.awssbgcuup.tech/feedback',
      certificateId: registration.certificateId || `AWS-SBG-${new Date().getFullYear()}-${registration.id.slice(-6).toUpperCase()}`,
      certificateUrl: 'https://www.awssbgcuup.tech/verification'
    };
  }, [registration, matchingEvent, customNotes]);

  // Find Corresponding Base Template
  const baseTemplate = useMemo(() => {
    return (
      DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === currentPurposeDef.templateType) ||
      DEFAULT_EMAIL_TEMPLATES[0]
    );
  }, [currentPurposeDef]);

  // When purpose or registration changes, reset form & load default subject
  useEffect(() => {
    if (!registration || !isOpen) return;

    setShowConfirm(false);
    setSendResult(null);
    setIsSent(false);

    if (selectedPurpose === 'event_important_info') {
      setSubject(`Important Information: ${matchingEvent?.title || registration.eventName}`);
      setCustomNotes('Please arrive 15 minutes before the session start time. Bring your Student ID card and laptop.');
    } else if (selectedPurpose === 'custom_message') {
      setSubject(`Notification: ${matchingEvent?.title || registration.eventName}`);
      setCustomNotes('Dear student, this is an official message from the AWS SBG CU-UP Team regarding your session.');
    } else {
      const defaultSubj = interpolateVariables(baseTemplate.subject, variablesMap);
      setSubject(defaultSubj);
      setCustomNotes('');
    }
  }, [selectedPurpose, registration, isOpen, baseTemplate, matchingEvent, variablesMap]);

  // Generate Rendered HTML & Plain Text
  const { renderedSubject, renderedHtml, renderedText } = useMemo(() => {
    if (!registration) {
      return { renderedSubject: '', renderedHtml: '', renderedText: '' };
    }

    let rawBodyHtml = baseTemplate.bodyHtml;
    let rawBodyText = baseTemplate.bodyText;

    // For Important Info or Custom Message, customize the body
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
    const finalSubject = interpolateVariables(currentSubj, variablesMap);
    const interpolatedBodyHtml = interpolateVariables(rawBodyHtml, variablesMap);
    const interpolatedBodyText = interpolateVariables(rawBodyText, variablesMap);

    const fullHtml = renderEmailLayout({
      title: finalSubject,
      contentHtml: interpolatedBodyHtml
    });

    return {
      renderedSubject: finalSubject,
      renderedHtml: fullHtml,
      renderedText: interpolatedBodyText
    };
  }, [registration, baseTemplate, selectedPurpose, subject, customNotes, variablesMap]);

  if (!isOpen || !registration) return null;

  // Handle Submit
  const handleDispatchEmail = async () => {
    if (isSending || isSent) return;
    setIsSending(true);
    setSendResult(null);

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
          registrationId: registration.id,
          to: registration.email,
          recipientName: registration.name,
          subject: renderedSubject,
          contentHtml: renderedHtml,
          contentText: renderedText,
          templateId: baseTemplate.id,
          type: currentPurposeDef.templateType,
          adminId: 'admin',
          metadata: {
            registrationId: registration.id,
            studentName: registration.name,
            eventName: matchingEvent?.title || registration.eventName,
            purpose: currentPurposeDef.label
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSent(true);
        setShowConfirm(false);
        setSendResult({
          success: true,
          messageId: data.result?.messageId || data.result?.providerId,
          timestamp: new Date().toLocaleTimeString()
        });
        if (onEmailSent) {
          onEmailSent(data);
        }
      } else {
        setSendResult({
          success: false,
          error: data.error || 'Failed to dispatch email via Resend.'
        });
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        error: err.message || 'Network error occurred while connecting to email server.'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans text-xs">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-[#0B0F17] text-white border-b border-[#1E293B] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF9900]/20 border border-[#FF9900]/40 flex items-center justify-center text-base">
              ✉️
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                Send Email to Student
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Centralized Resend Email Hub &bull; Automatic Branded Personalization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          
          {/* 1. STUDENT REGISTRATION SUMMARY CARD */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                Student Registration Record
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-50 text-[#FF9900] border border-orange-200">
                ID: {registration.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-white border border-[#E2E8F0] rounded-md">
                <span className="text-[10px] font-semibold text-[#64748B] block uppercase">Student Name</span>
                <span className="font-bold text-[#111827] text-xs truncate block">{registration.name}</span>
              </div>
              <div className="p-2.5 bg-white border border-[#E2E8F0] rounded-md">
                <span className="text-[10px] font-semibold text-[#64748B] block uppercase">Email Address</span>
                <span className="font-mono text-[11px] text-[#0F172A] truncate block">{registration.email}</span>
              </div>
              <div className="p-2.5 bg-white border border-[#E2E8F0] rounded-md">
                <span className="text-[10px] font-semibold text-[#64748B] block uppercase">Event</span>
                <span className="font-semibold text-[#111827] text-xs truncate block">{registration.eventName}</span>
              </div>
              <div className="p-2.5 bg-white border border-[#E2E8F0] rounded-md">
                <span className="text-[10px] font-semibold text-[#64748B] block uppercase">Status</span>
                <span className="font-bold text-xs uppercase text-emerald-700 block">{registration.status}</span>
              </div>
            </div>
          </div>

          {/* 2. SEND SUCCESS FEEDBACK BANNER */}
          {sendResult?.success && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 space-y-1.5 animate-in fade-in">
              <div className="flex items-center space-x-2">
                <span className="text-base">✅</span>
                <span className="font-bold text-sm">Email Dispatched Successfully!</span>
              </div>
              <p className="text-xs">
                The message was accepted by Resend and routed to <strong>{registration.email}</strong>.
              </p>
              <div className="pt-1 flex items-center space-x-3 text-[11px] font-mono text-emerald-800">
                <span><strong>Message ID:</strong> {sendResult.messageId}</span>
                <span>&bull;</span>
                <span><strong>Logged in Email Center:</strong> Yes</span>
              </div>
            </div>
          )}

          {/* 3. SEND ERROR FEEDBACK BANNER */}
          {sendResult && !sendResult.success && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-900 space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-base">⚠️</span>
                <span className="font-bold text-sm">Delivery Error</span>
              </div>
              <p className="text-xs">{sendResult.error}</p>
            </div>
          )}

          {/* 4. TABS: COMPOSE VS PREVIEW */}
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
                👁️ Preview Final Email
              </button>
            </div>

            <div className="text-[11px] text-[#64748B] flex items-center space-x-2">
              <span>Sender:</span>
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
                  Email Purpose
                </label>
                <select
                  value={selectedPurpose}
                  onChange={(e) => setSelectedPurpose(e.target.value as EmailPurposeOption)}
                  disabled={isSent || isSending}
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
                  disabled={isSent || isSending}
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
                    disabled={isSent || isSending}
                    placeholder="Enter custom instructions or notes for the student..."
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] leading-relaxed font-sans"
                  />
                </div>
              )}

              {/* Personalization Inspection */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1 text-[11px] text-amber-900">
                <span className="font-bold block">✨ Dynamic Personalization Engine:</span>
                <span>
                  The greeting will automatically render <strong>Dear {registration.name},</strong> with all event and registration parameters securely injected without raw curly placeholders.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>
                  Subject: <strong className="text-[#111827]">{renderedSubject}</strong>
                </span>
                <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                  Branded HTML Layout
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 max-h-[460px] overflow-y-auto shadow-inner">
                <iframe
                  title="Branded Student Email Preview"
                  srcDoc={renderedHtml}
                  className="w-full h-[450px] border-none bg-white"
                />
              </div>
            </div>
          )}

          {/* 5. CONFIRMATION MODAL OVERLAY */}
          {showConfirm && (
            <div className="p-4 bg-orange-50 border border-[#FF9900] rounded-lg space-y-3 animate-in fade-in">
              <div className="flex items-start space-x-2">
                <span className="text-lg">✉️</span>
                <div>
                  <h4 className="font-bold text-xs text-[#111827]">
                    Send this email to {registration.name}?
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Recipient: <strong className="font-mono text-[#0F172A]">{registration.email}</strong> &bull; Sender: <span className="font-mono">{senderAddress}</span>
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
                  disabled={isSending || isSent}
                  onClick={handleDispatchEmail}
                  className="px-4 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-xs cursor-pointer transition-all flex items-center space-x-1.5"
                >
                  <span>{isSending ? 'Sending...' : '🚀 Confirm & Send Email'}</span>
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
            className="px-4 py-2 border border-[#E2E8F0] hover:bg-slate-100 text-slate-700 text-xs font-bold rounded transition-colors cursor-pointer"
          >
            {isSent ? 'Close' : 'Cancel'}
          </button>

          <div className="flex items-center space-x-2">
            {activeTab === 'compose' ? (
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded transition-colors cursor-pointer"
              >
                Preview Email
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded transition-colors cursor-pointer"
              >
                Edit Details
              </button>
            )}

            {!isSent && !showConfirm && (
              <button
                type="button"
                disabled={isSending}
                onClick={() => setShowConfirm(true)}
                className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
              >
                <span>✉️ Send Email</span>
              </button>
            )}

            {isSent && (
              <button
                type="button"
                disabled
                className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded opacity-75 cursor-not-allowed flex items-center space-x-1.5"
              >
                <span>✓ Email Sent</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
