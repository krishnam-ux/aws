'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  EmailType,
  EmailLog,
  EmailTemplate,
  EmailAutomationSetting,
  EmailRecipient,
  EmailBatchSummary,
  EmailDeliveryStatus
} from '@/types/email';
import { DEFAULT_EMAIL_TEMPLATES } from '@/lib/email/templates';

interface AdminEmailManagerProps {
  token: string | null;
}

export default function AdminEmailManager({ token }: AdminEmailManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'compose' | 'automations' | 'templates' | 'logs'>('compose');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Data States
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [automations, setAutomations] = useState<EmailAutomationSetting[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logStats, setLogStats] = useState({ total: 0, sent: 0, failed: 0, simulated: 0 });
  const [availableRecipients, setAvailableRecipients] = useState<EmailRecipient[]>([]);

  // Compose State
  const [composeMode, setComposeMode] = useState<'single' | 'bulk'>('single');
  const [recipientSource, setRecipientSource] = useState<'ALL' | 'EVENT' | 'OPPORTUNITY' | 'EXAM' | 'TEAM' | 'CUSTOM'>('EVENT');
  const [selectedRecipients, setSelectedRecipients] = useState<EmailRecipient[]>([]);
  const [singleTo, setSingleTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [emailType, setEmailType] = useState<EmailType>('admin_manual_message');
  const [contentHtml, setContentHtml] = useState('<p>Hello {{studentName}},</p><p>We are excited to share an update with you regarding AWS Student Builder Group CU-UP!</p>');
  const [previewHtml, setPreviewHtml] = useState('');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState<EmailBatchSummary | null>(null);
  const [showBatchConfirmModal, setShowBatchConfirmModal] = useState(false);

  // Template Manager State
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Delivery Logs Filter State
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('ALL');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('ALL');
  const [selectedLogDetail, setSelectedLogDetail] = useState<EmailLog | null>(null);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Headers helper
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  // Fetch initial data
  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/admin/email/templates', { headers: getHeaders(), cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Failed to load email templates:', err);
    }
  };

  const loadAutomations = async () => {
    try {
      const res = await fetch('/api/admin/email/automations', { headers: getHeaders(), cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations || []);
      }
    } catch (err) {
      console.error('Failed to load automations:', err);
    }
  };

  const loadLogs = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (logStatusFilter !== 'ALL') queryParams.set('status', logStatusFilter);
      if (logTypeFilter !== 'ALL') queryParams.set('type', logTypeFilter);
      if (logSearchQuery.trim()) queryParams.set('q', logSearchQuery.trim());

      const res = await fetch(`/api/admin/email/logs?${queryParams.toString()}`, {
        headers: getHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.stats) setLogStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load email logs:', err);
    }
  };

  const loadRecipients = async (source = 'ALL') => {
    try {
      const res = await fetch(`/api/admin/email/recipients?source=${source}`, {
        headers: getHeaders(),
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableRecipients(data.recipients || []);
      }
    } catch (err) {
      console.error('Failed to load recipients:', err);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadAutomations();
    loadLogs();
    loadRecipients(recipientSource);
  }, []);

  useEffect(() => {
    if (activeSubTab === 'logs') {
      loadLogs();
    }
  }, [logStatusFilter, logTypeFilter, logSearchQuery, activeSubTab]);

  useEffect(() => {
    loadRecipients(recipientSource);
  }, [recipientSource]);

  // Update preview when content changes
  useEffect(() => {
    updateLivePreview();
  }, [subject, contentHtml, selectedTemplateId]);

  const updateLivePreview = async () => {
    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          action: 'preview',
          template: {
            subject: subject || 'Sample Email Subject',
            bodyHtml: contentHtml
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.renderedHtml || '');
      }
    } catch (err) {
      console.error('Preview error:', err);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = templates.find((t) => t.id === templateId || t.type === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setContentHtml(tpl.bodyHtml);
      setEmailType(tpl.type);
    }
  };

  // Toggle automation setting
  const toggleAutomation = async (eventType: EmailType, currentEnabled: boolean) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/email/automations', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          eventType,
          isEnabled: !currentEnabled,
          adminUser: 'admin'
        })
      });

      if (res.ok) {
        setAutomations((prev) =>
          prev.map((a) => (a.eventType === eventType ? { ...a, isEnabled: !currentEnabled } : a))
        );
        setStatusMessage({
          type: 'success',
          text: `Automation "${eventType}" is now ${!currentEnabled ? 'ENABLED' : 'DISABLED'}.`
        });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to update automation.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error updating automation' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Save template edit
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    try {
      setLoading(true);
      const res = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          template: editingTemplate
        })
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Template "${editingTemplate.name}" saved successfully!` });
        setEditingTemplate(null);
        loadTemplates();
      } else {
        const data = await res.json();
        setStatusMessage({ type: 'error', text: data.error || 'Failed to save template.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving template.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Send test email
  const handleSendTest = async () => {
    if (!testEmailRecipient || !editingTemplate) return;
    try {
      setIsSendingTest(true);
      const res = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          action: 'test_send',
          testRecipient: testEmailRecipient,
          template: editingTemplate
        })
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Test email dispatched to ${testEmailRecipient}!` });
      } else {
        const data = await res.json();
        setStatusMessage({ type: 'error', text: data.error || 'Failed to send test email.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed test delivery' });
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Retry failed log
  const handleRetryEmail = async (logId: string) => {
    try {
      setRetryingLogId(logId);
      const res = await fetch('/api/admin/email/logs', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action: 'retry', logId })
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMessage({
          type: data.success ? 'success' : 'error',
          text: data.message || 'Email retried.'
        });
        loadLogs();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Retry failed' });
    } finally {
      setRetryingLogId(null);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Send single email
  const handleSendSingleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleTo || !subject.trim()) {
      setStatusMessage({ type: 'error', text: 'Recipient and Subject are required.' });
      return;
    }

    try {
      setIsSending(true);
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          mode: 'single',
          to: singleTo.trim(),
          cc: cc ? cc.split(',').map((s) => s.trim()) : undefined,
          bcc: bcc ? bcc.split(',').map((s) => s.trim()) : undefined,
          subject: subject.trim(),
          contentHtml,
          type: emailType,
          templateId: selectedTemplateId || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', text: `Email dispatched successfully to ${singleTo}!` });
        setSingleTo('');
        setSubject('');
        loadLogs();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to dispatch email.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Dispatch error occurred.' });
    } finally {
      setIsSending(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Send batch bulk emails
  const handleSendBatchEmail = async () => {
    setShowBatchConfirmModal(false);
    const targetRecipients = selectedRecipients.length > 0 ? selectedRecipients : availableRecipients;

    if (targetRecipients.length === 0) {
      setStatusMessage({ type: 'error', text: 'No recipients selected for batch send.' });
      return;
    }

    try {
      setIsSending(true);
      setBatchProgress(null);

      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          mode: 'batch',
          recipients: targetRecipients,
          subject: subject.trim(),
          contentHtml,
          type: emailType,
          templateId: selectedTemplateId || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.summary) {
        setBatchProgress(data.summary);
        setStatusMessage({
          type: 'success',
          text: `Batch Complete: ${data.summary.sent} emails dispatched (${data.summary.failed} failed).`
        });
        loadLogs();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed batch dispatch.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Batch dispatch failed.' });
    } finally {
      setIsSending(false);
    }
  };

  const insertVariableChip = (variable: string) => {
    const placeholder = `{{${variable}}}`;
    setContentHtml((prev) => `${prev} ${placeholder} `);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. TOP HEADER & METRICS BAR */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF9900]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display font-extrabold text-lg text-[#111827] flex items-center space-x-2">
                <span>Centralized Email & Notification Hub</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  SMTP / Simulated
                </span>
              </h2>
              <p className="text-xs text-[#64748B]">
                Automated multi-channel communications, branded HTML templates, batch broadcasts & delivery tracking.
              </p>
            </div>
          </div>

          {/* Subtabs navigation */}
          <div className="flex bg-[#F6F8FA] p-1 rounded-lg border border-[#E2E8F0] text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('compose')}
              className={`px-3.5 py-1.5 rounded transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'compose'
                  ? 'bg-white text-[#FF9900] shadow-sm'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <span>✉️</span>
              <span>Compose & Broadcast</span>
            </button>
            <button
              onClick={() => setActiveSubTab('automations')}
              className={`px-3.5 py-1.5 rounded transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'automations'
                  ? 'bg-white text-[#FF9900] shadow-sm'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <span>⚡</span>
              <span>Automations Matrix</span>
              <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full">
                {automations.filter((a) => a.isEnabled).length}
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab('templates')}
              className={`px-3.5 py-1.5 rounded transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'templates'
                  ? 'bg-white text-[#FF9900] shadow-sm'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <span>📋</span>
              <span>Templates</span>
              <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full">
                {templates.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab('logs')}
              className={`px-3.5 py-1.5 rounded transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'logs'
                  ? 'bg-white text-[#FF9900] shadow-sm'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <span>📊</span>
              <span>Delivery Logs</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs font-sans">
          <div className="p-3 bg-[#F6F8FA] border border-[#E2E8F0] rounded">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">Total Dispatched</span>
            <span className="text-xl font-extrabold text-[#111827] mt-0.5 block">{logStats.total}</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded text-emerald-800">
            <span className="text-[10px] uppercase font-bold tracking-wider block">Delivered (Sent)</span>
            <span className="text-xl font-extrabold mt-0.5 block">{logStats.sent}</span>
          </div>
          <div className="p-3 bg-red-50 border border-red-100 rounded text-red-800">
            <span className="text-[10px] uppercase font-bold tracking-wider block">Failed / Bounced</span>
            <span className="text-xl font-extrabold mt-0.5 block">{logStats.failed}</span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded text-amber-800">
            <span className="text-[10px] uppercase font-bold tracking-wider block">Automations Active</span>
            <span className="text-xl font-extrabold mt-0.5 block">
              {automations.filter((a) => a.isEnabled).length} / {automations.length}
            </span>
          </div>
        </div>
      </div>

      {/* Global Status Message */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-bold transition-all shadow-sm flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* 2. SUBTAB 1: COMPOSE & BROADCAST */}
      {activeSubTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-display font-bold text-sm text-[#111827]">Email Composer</h3>
              {/* Single / Bulk Switch */}
              <div className="flex bg-[#F6F8FA] p-0.5 rounded border border-[#E2E8F0] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setComposeMode('single')}
                  className={`px-3 py-1 rounded transition-colors ${
                    composeMode === 'single' ? 'bg-white text-[#FF9900] shadow-xs' : 'text-[#64748B]'
                  }`}
                >
                  Single Send
                </button>
                <button
                  type="button"
                  onClick={() => setComposeMode('bulk')}
                  className={`px-3 py-1 rounded transition-colors ${
                    composeMode === 'bulk' ? 'bg-white text-[#FF9900] shadow-xs' : 'text-[#64748B]'
                  }`}
                >
                  Bulk Broadcast
                </button>
              </div>
            </div>

            <form onSubmit={composeMode === 'single' ? handleSendSingleEmail : (e) => { e.preventDefault(); setShowBatchConfirmModal(true); }} className="space-y-4 text-xs font-sans">
              {/* Template Preset Loader */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Load Pre-built Template (Optional)
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#FF9900] font-medium text-xs"
                >
                  <option value="">-- Custom Manual Email (Blank Canvas) --</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      [{tpl.category}] {tpl.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Single Mode: To, CC, BCC */}
              {composeMode === 'single' ? (
                <>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block">
                      To <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@university.edu"
                      value={singleTo}
                      onChange={(e) => setSingleTo(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-[#F6F8FA] font-mono text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B] uppercase tracking-wider block text-[10px]">
                        CC (Comma separated)
                      </label>
                      <input
                        type="text"
                        placeholder="cc@example.com"
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-[#F6F8FA] font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#64748B] uppercase tracking-wider block text-[10px]">
                        BCC (Comma separated)
                      </label>
                      <input
                        type="text"
                        placeholder="bcc@example.com"
                        value={bcc}
                        onChange={(e) => setBcc(e.target.value)}
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-[#F6F8FA] font-mono text-xs"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Bulk Broadcast Mode */
                <div className="space-y-3 p-3.5 bg-orange-50/60 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-orange-950 uppercase tracking-wider block">
                      Broadcast Target Audience
                    </label>
                    <span className="text-xs font-bold text-[#FF9900] bg-white px-2 py-0.5 rounded border border-orange-200">
                      {availableRecipients.length} Recipient{availableRecipients.length === 1 ? '' : 's'} Available
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'EVENT', label: 'Event Attendees' },
                      { id: 'OPPORTUNITY', label: 'Applicants' },
                      { id: 'EXAM', label: 'Exam Candidates' },
                      { id: 'TEAM', label: 'Core Team' },
                      { id: 'ALL', label: 'All Community' }
                    ].map((src) => (
                      <button
                        type="button"
                        key={src.id}
                        onClick={() => setRecipientSource(src.id as any)}
                        className={`p-2 rounded text-xs font-bold border transition-colors ${
                          recipientSource === src.id
                            ? 'bg-[#FF9900] text-white border-[#FF9900]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {src.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="AWS SBG Official Announcement: ..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900] font-medium text-xs"
                />
              </div>

              {/* Variable Helper Chips */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#64748B] uppercase tracking-wider block text-[10px]">
                  Insert Dynamic Variables (Click to Add)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['studentName', 'eventName', 'eventDate', 'eventTime', 'venue', 'registrationId', 'opportunityTitle', 'score', 'verdict'].map((v) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => insertVariableChip(v)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-orange-100 hover:text-[#FF9900] border border-slate-200 text-[10px] font-mono font-semibold rounded cursor-pointer transition-colors"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Content */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Email Body (HTML / Formatted Content)
                </label>
                <textarea
                  rows={8}
                  required
                  value={contentHtml}
                  onChange={(e) => setContentHtml(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] leading-relaxed"
                />
              </div>

              {/* Dispatch Button */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[11px] text-[#64748B]">
                  🛡️ Branded AWS SBG header, footer & security headers automatically attached.
                </span>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>{isSending ? 'Sending...' : composeMode === 'single' ? '✉️ Dispatch Email' : '🚀 Launch Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Live Branded Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#64748B]">
                  Live Email Preview
                </h4>
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Responsive Branded Layout
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 max-h-[600px] overflow-y-auto">
                {previewHtml ? (
                  <iframe
                    title="Email Preview"
                    srcDoc={previewHtml}
                    className="w-full h-[520px] border-none bg-white"
                  />
                ) : (
                  <div className="p-8 text-center text-slate-400">Loading live preview...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUBTAB 2: AUTOMATIONS MATRIX */}
      {activeSubTab === 'automations' && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
          <div className="border-b border-[#E2E8F0] pb-4">
            <h3 className="font-display font-bold text-base text-[#111827]">
              Automated Email Trigger Settings
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              Toggle automated transactional emails dispatched on student actions (Registration, Exam Evaluation, Selection, Opportunities, Feedback).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((auto) => (
              <div
                key={auto.id}
                className={`p-4 rounded-lg border transition-all flex items-start justify-between space-x-4 ${
                  auto.isEnabled ? 'bg-white border-[#E2E8F0] shadow-xs' : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono ${
                        auto.category === 'EVENTS'
                          ? 'bg-blue-100 text-blue-800'
                          : auto.category === 'EXAMS'
                          ? 'bg-amber-100 text-amber-800'
                          : auto.category === 'OPPORTUNITIES'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {auto.category}
                    </span>
                    <h4 className="font-bold text-xs text-[#111827] truncate">{auto.title}</h4>
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">{auto.description}</p>
                  <div className="text-[9px] text-slate-400 font-mono">Trigger Key: {auto.eventType}</div>
                </div>

                {/* Toggle Switch */}
                <div className="flex flex-col items-end space-y-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => toggleAutomation(auto.eventType, auto.isEnabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      auto.isEnabled ? 'bg-[#FF9900]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        auto.isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-[9px] font-bold uppercase font-mono ${auto.isEnabled ? 'text-[#FF9900]' : 'text-slate-400'}`}>
                    {auto.isEnabled ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SUBTAB 3: TEMPLATES MANAGER */}
      {activeSubTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="font-display font-bold text-base text-[#111827]">
                  Master Email Templates
                </h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Customize the official AWS SBG branded layouts and default copy across all notification types.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white border border-[#E2E8F0] hover:border-[#FF9900] rounded-lg p-5 shadow-xs transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono uppercase">
                        {tpl.category}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-bold">● Active</span>
                    </div>
                    <h4 className="font-bold text-sm text-[#111827]">{tpl.name}</h4>
                    <p className="text-xs text-[#64748B] font-mono text-[11px] truncate">{tpl.subject}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{tpl.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">{tpl.variables.length} variables</span>
                    <button
                      onClick={() => setEditingTemplate(tpl)}
                      className="px-3 py-1 bg-slate-100 hover:bg-[#FF9900] hover:text-white text-slate-800 text-xs font-bold rounded transition-colors cursor-pointer"
                    >
                      Edit Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. SUBTAB 4: DELIVERY LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div>
              <h3 className="font-display font-bold text-base text-[#111827]">
                Email Delivery Logs & Audit Trail
              </h3>
              <p className="text-xs text-[#64748B] mt-1">
                Real-time tracking of sent messages, SMTP delivery statuses, simulated dispatches and retry controls.
              </p>
            </div>
            <button
              onClick={loadLogs}
              className="px-3.5 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] hover:border-[#FF9900] text-xs font-bold rounded cursor-pointer transition-colors"
            >
              🔄 Refresh Logs
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <input
              type="text"
              placeholder="Search recipient or subject..."
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-[#E2E8F0] rounded w-64 bg-[#F6F8FA] focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
            />
            <select
              value={logStatusFilter}
              onChange={(e) => setLogStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-[#E2E8F0] rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">SENT (Live/Simulated)</option>
              <option value="FAILED">FAILED</option>
              <option value="SIMULATED">SIMULATED</option>
            </select>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-sans">
              <thead className="bg-[#F6F8FA] font-display font-bold text-[#64748B]">
                <tr>
                  <th className="px-4 py-3 text-left">Recipient</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Sent At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-slate-800">{log.recipient}</td>
                      <td className="px-4 py-3 font-semibold text-[#111827] max-w-xs truncate">{log.subject}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{log.type}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                            log.status === 'SENT'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.status === 'FAILED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">
                        {new Date(log.sentAt || log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLogDetail(log)}
                          className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer"
                        >
                          Details
                        </button>
                        {log.status === 'FAILED' && (
                          <button
                            disabled={retryingLogId === log.id}
                            onClick={() => handleRetryEmail(log.id)}
                            className="text-[#FF9900] hover:text-[#E08800] font-bold cursor-pointer ml-2"
                          >
                            {retryingLogId === log.id ? 'Retrying...' : 'Retry'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                      No email delivery logs recorded matching query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TEMPLATE & PREVIEW TEST */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans text-xs">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-sm text-[#111827]">Edit Master Template</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">{editingTemplate.name} ({editingTemplate.type})</p>
              </div>
              <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">Subject Line</label>
                <input
                  type="text"
                  required
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900] font-medium text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">Template Body (HTML)</label>
                <textarea
                  rows={8}
                  required
                  value={editingTemplate.bodyHtml}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, bodyHtml: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] leading-relaxed"
                />
              </div>

              {/* Test Send Section */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                  Send Test Email (Does not write to candidate logs)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    placeholder="your-email@example.com"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    className="flex-grow px-3 py-1.5 border border-[#E2E8F0] rounded bg-white text-xs font-mono"
                  />
                  <button
                    type="button"
                    disabled={isSendingTest || !testEmailRecipient}
                    onClick={handleSendTest}
                    className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded text-xs hover:bg-slate-900 disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingTest ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded shadow-xs cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BATCH BROADCAST CONFIRMATION */}
      {showBatchConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans text-xs">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-display font-extrabold text-sm text-[#111827]">
              Confirm Mass Email Broadcast?
            </h3>
            <p className="text-slate-600 leading-relaxed">
              You are about to broadcast this email to <strong>{availableRecipients.length} recipients</strong> from audience group <strong>{recipientSource}</strong>.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] space-y-1">
              <span className="font-bold block">Safety Assurance:</span>
              <span>- Automatic duplicate deduplication is enforced.</span><br/>
              <span>- Failed dispatches are isolated and logged without halting other recipients.</span>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowBatchConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendBatchEmail}
                className="px-5 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded shadow-xs cursor-pointer"
              >
                🚀 Confirm & Send Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG DETAILS */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans text-xs">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-sm text-[#111827]">Email Delivery Audit Record</h3>
              <button onClick={() => setSelectedLogDetail(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              <div><strong>Log ID:</strong> {selectedLogDetail.id}</div>
              <div><strong>Recipient:</strong> {selectedLogDetail.recipient}</div>
              <div><strong>Subject:</strong> {selectedLogDetail.subject}</div>
              <div><strong>Status:</strong> {selectedLogDetail.status}</div>
              <div><strong>Type:</strong> {selectedLogDetail.type}</div>
              <div><strong>Triggered By:</strong> {selectedLogDetail.triggeredBy}</div>
              <div><strong>Message ID:</strong> {selectedLogDetail.providerId || 'N/A'}</div>
              {selectedLogDetail.errorMessage && (
                <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded">
                  <strong>Error:</strong> {selectedLogDetail.errorMessage}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-1.5 bg-[#F6F8FA] border border-slate-200 rounded font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
