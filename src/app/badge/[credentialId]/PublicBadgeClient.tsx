'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DigitalBadge } from '@/types/digitalBadge';
import { formatDisplayDate, getBadgeUrl, getBadgeVerificationUrl, getLinkedInAddCertUrl } from '@/lib/digitalBadgeUtils';

interface PublicBadgeClientProps {
  badge: DigitalBadge;
  badgeSvg: string;
}

export default function PublicBadgeClient({ badge, badgeSvg }: PublicBadgeClientProps) {
  const [toastMessage, setToastMessage] = useState('');
  const isRevoked = badge.status === 'REVOKED';
  const credentialUrl = badge.credentialUrl || getBadgeUrl(badge.credentialId);
  const verifyUrl = badge.verificationUrl || getBadgeVerificationUrl(badge.credentialId);
  const linkedInUrl = getLinkedInAddCertUrl(badge);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `${badge.recipientName} – ${badge.badgeTitle}`,
          text: `Verified AWS Digital Credential earned by ${badge.recipientName}: ${badge.badgeTitle}`,
          url: credentialUrl
        });
        return;
      } catch (err) {
        // Fallback to copy link
      }
    }
    await copyText(credentialUrl, 'Credential Link');
  };

  const downloadSvg = () => {
    const blob = new Blob([badgeSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AWS-Badge-${badge.credentialId}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Badge vector artwork downloaded!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#07131F] border-2 border-[#FF9900] text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center space-x-2 animate-bounce">
          <span className="text-[#FF9900]">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Revocation Warning Banner (if revoked) */}
      {isRevoked && (
        <div className="p-6 bg-rose-950/80 border-2 border-rose-600 rounded-3xl text-rose-200 shadow-2xl space-y-2">
          <div className="flex items-center space-x-2.5 text-rose-400 font-extrabold text-sm uppercase tracking-wider">
            <span className="text-2xl">⚠</span>
            <span>Credential Revoked by Issuer</span>
          </div>
          <p className="text-xs text-rose-300 leading-relaxed">
            This digital credential was permanently revoked by the issuing authority
            {badge.revokedAt ? ` on ${formatDisplayDate(badge.revokedAt)}` : ''}.
            {badge.revokedReason ? ` Authoritative Reason: "${badge.revokedReason}"` : ''}
          </p>
        </div>
      )}

      {/* MAIN CREDENTIAL CARD CONTAINER */}
      <div className="bg-gradient-to-b from-[#0B1E30] via-[#07131F] to-[#040C14] border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Subtle Ambient Backlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#FF9900]/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. HERO BADGE DISPLAY */}
        <div className="pt-12 pb-8 px-6 text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 max-w-sm aspect-square drop-shadow-[0_24px_45px_rgba(0,0,0,0.75)] transform hover:scale-[1.02] transition-transform duration-300 flex items-center justify-center">
              <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: badgeSvg }} />
            </div>
          </div>

          {/* Verification Status Pill */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider shadow-lg mb-4 border">
            {isRevoked ? (
              <span className="bg-rose-500/20 border-rose-500/40 text-rose-400 flex items-center space-x-1.5 px-3 py-0.5 rounded-full">
                <span>⚠</span>
                <span>PERMANENTLY REVOKED</span>
              </span>
            ) : (
              <span className="bg-emerald-500/20 border-emerald-500/40 text-emerald-300 flex items-center space-x-1.5 px-3 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>✓ OFFICIALLY VERIFIED CREDENTIAL</span>
              </span>
            )}
          </div>

          {/* Recipient & Title Block */}
          <div className="space-y-2 max-w-2xl mx-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awarded To</div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {badge.recipientName}
            </h1>
            <h2 className="text-lg sm:text-xl font-bold text-[#FF9900] tracking-wide">
              {badge.badgeTitle}
            </h2>
          </div>
        </div>

        {/* 2. PRIMARY ACTION TOOLBAR */}
        <div className="px-6 py-6 border-t border-b border-slate-800/80 bg-[#050E17]/60">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-5 bg-[#0077B5] hover:bg-[#006396] text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>in</span>
                <span>Add to LinkedIn Profile</span>
              </a>

              <a
                href={`/api/digital-badges/pdf/${badge.credentialId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-5 bg-gradient-to-r from-[#FF9900] to-[#E68A00] hover:from-[#E68A00] hover:to-[#CC7A00] text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>📄</span>
                <span>Download Official PDF</span>
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => copyText(badge.credentialId, 'Credential ID')}
                className="py-2.5 px-3 bg-slate-800/70 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>📋</span>
                <span>Copy ID</span>
              </button>

              <button
                onClick={() => copyText(credentialUrl, 'Credential URL')}
                className="py-2.5 px-3 bg-slate-800/70 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>🔗</span>
                <span>Copy URL</span>
              </button>

              <button
                onClick={downloadSvg}
                className="py-2.5 px-3 bg-slate-800/70 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>💾</span>
                <span>Badge SVG</span>
              </button>

              <button
                onClick={handleShare}
                className="py-2.5 px-3 bg-slate-800/70 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>📢</span>
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. STRUCTURED 3-COLUMN CREDENTIAL METADATA */}
        <div className="p-6 sm:p-8 bg-[#07131F]/90">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0D2235]/60 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                ISSUED ON
              </span>
              <span className="text-sm font-extrabold text-slate-100 block">
                {formatDisplayDate(badge.issueDate || badge.issuedAt)}
              </span>
            </div>

            <div className="bg-[#0D2235]/60 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                CREDENTIAL ID
              </span>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-extrabold text-[#FF9900]">
                  {badge.credentialId}
                </span>
                <button
                  onClick={() => copyText(badge.credentialId, 'Credential ID')}
                  title="Copy ID"
                  className="text-slate-400 hover:text-white text-xs"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="bg-[#0D2235]/60 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                ISSUED BY
              </span>
              <span className="text-xs font-bold text-slate-200 block leading-tight">
                {badge.issuerName || 'AWS Student Builder Group – Chandigarh University Uttar Pradesh'}
              </span>
            </div>
          </div>
        </div>

        {/* 4. EARNING CRITERIA & VERIFIED SKILLS */}
        <div className="p-6 sm:p-8 border-t border-slate-800/80 space-y-6">
          {/* Earning Criteria */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
              <span>🎯</span>
              <span>Earning Criteria</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#0D2235]/40 p-4 rounded-2xl border border-slate-800">
              {badge.earningCriteria || badge.badgeDescription}
            </p>
          </div>

          {/* Verified Skills */}
          {badge.skills && badge.skills.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                <span>⚡</span>
                <span>Verified Skills &amp; Competencies</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {badge.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-[#0D2235] border border-[#FF9900]/30 text-[#FF9900] text-xs font-bold rounded-xl shadow-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. DEDICATED QR & REAL-TIME VERIFICATION SECTION */}
        <div className="p-6 sm:p-8 border-t border-slate-800/80 bg-[#040C14] text-center space-y-4">
          <div className="inline-block px-3 py-1 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
            SCAN TO VERIFY
          </div>

          <div className="flex justify-center">
            <div className="p-3.5 bg-white rounded-2xl shadow-2xl inline-block border-2 border-slate-700">
              <img
                src={`/api/digital-badges/qr/${badge.credentialId}`}
                alt={`QR code for ${badge.credentialId}`}
                className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
              />
            </div>
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <p className="text-xs text-slate-400 font-mono break-all">
              {verifyUrl}
            </p>
            <div className="pt-2">
              <Link
                href={`/verify-badge/${badge.credentialId}`}
                className="inline-block px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                Open Live Verification &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
