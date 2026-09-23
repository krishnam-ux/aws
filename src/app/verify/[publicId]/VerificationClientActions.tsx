'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface VerificationClientActionsProps {
  publicId: string;
  fullName: string;
  cardUrl: string;
  verificationUrl: string;
}

export default function VerificationClientActions({
  publicId,
  fullName,
  cardUrl,
  verificationUrl
}: VerificationClientActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const fullUrl = window.location.href;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Verified Digital ID - ${fullName} (${publicId})`,
          text: `Official verified Digital ID of ${fullName} at AWS Student Builder Group CU-UP:`,
          url: window.location.href
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await handleCopyLink();
    }
  };

  return (
    <div className="pt-2 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-3">
      <Link
        href={`/id/${encodeURIComponent(publicId)}`}
        className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#FF9900] to-[#FFAC33] hover:from-[#EC7211] hover:to-[#FF9900] text-[#081A2A] font-display font-extrabold text-xs shadow-md transition-transform active:scale-95"
      >
        <span>💳</span>
        <span>View Digital ID Card</span>
      </Link>

      <div className="w-full sm:w-auto flex items-center justify-center sm:justify-end gap-2">
        <button
          onClick={handleShare}
          type="button"
          className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          title="Share verification link"
        >
          <span>🔗</span>
          <span>Share</span>
        </button>

        <button
          onClick={handleCopyLink}
          type="button"
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
        >
          <span>{copied ? '✓' : '📋'}</span>
          <span>{copied ? 'Copied URL!' : 'Copy Link'}</span>
        </button>

        <a
          href={`/api/digital-ids/pdf/${encodeURIComponent(publicId)}`}
          download={`Digital-ID-${publicId}.pdf`}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          title="Download PDF Card Badge"
        >
          <span>📄</span>
          <span>PDF</span>
        </a>
      </div>
    </div>
  );
}
