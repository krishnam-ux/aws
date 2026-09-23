'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DigitalIdentity } from '@/types/digitalIdentity';
import { formatDisplayDate } from '@/lib/digitalIdUtils';

interface DigitalCardClientViewProps {
  identity: DigitalIdentity;
  qrDataUrl: string;
  verificationUrl: string;
}

export default function DigitalCardClientView({
  identity,
  qrDataUrl,
  verificationUrl
}: DigitalCardClientViewProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const isActive = identity.status === 'ACTIVE';
  const isSuspended = identity.status === 'SUSPENDED';
  const isRevoked = identity.status === 'REVOKED';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${identity.fullName} - Digital ID Card`,
          text: `Official Digital Identity for ${identity.fullName} (${identity.publicId}) at AWS Student Builder Group CU-UP.`,
          url: verificationUrl
        });
      } catch (err) {
        // Share cancelled or not supported
      }
    } else {
      handleCopyLink();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl flex flex-col items-center space-y-8 animate-fadeIn">
      {/* Top Breadcrumb & Community Branding */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-6 print:hidden">
        <div className="flex items-center space-x-3">
          <img
            src="/aws-logo.svg"
            alt="AWS"
            className="h-6 w-auto brightness-0 invert"
          />
          <span className="text-slate-600">|</span>
          <img
            src="/chandigarh-university-logo.jpg"
            alt="Chandigarh University"
            className="h-7 w-auto rounded object-contain bg-white/10 p-0.5"
          />
          <div>
            <p className="font-display font-bold text-xs uppercase tracking-wider text-slate-300">
              AWS Student Builder Group
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              Chandigarh University – Uttar Pradesh
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href={`/verify/${identity.publicId}`}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
          >
            <span>✓</span>
            <span>Live Verification Page</span>
          </Link>
        </div>
      </div>

      {/* CARD FLIP CONTROLS & INSTRUCTION (Hidden in print) */}
      <div className="flex items-center justify-center space-x-3 print:hidden">
        <button
          onClick={() => setIsFlipped(false)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            !isFlipped
              ? 'bg-[#FF9900] text-[#081A2A] shadow-md shadow-[#FF9900]/20'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Front Side
        </button>
        <button
          onClick={() => setIsFlipped(true)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            isFlipped
              ? 'bg-[#FF9900] text-[#081A2A] shadow-md shadow-[#FF9900]/20'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Back Side (QR)
        </button>
        <span className="text-[11px] text-slate-500 hidden sm:inline ml-2">
          (Click card or buttons to flip)
        </span>
      </div>

      {/* 3D INTERACTIVE CARD CONTAINER */}
      <div
        className="w-full max-w-[340px] sm:max-w-[380px] h-[580px] sm:h-[600px] cursor-pointer print:max-w-none print:h-auto"
        style={{ perspective: '1200px' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className="relative w-full h-full duration-700 transition-transform rounded-2xl shadow-2xl print:transform-none"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* ======================================================== */}
          {/* FRONT OF CARD */}
          {/* ======================================================== */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl p-6 flex flex-col justify-between overflow-hidden border border-slate-700/60 shadow-2xl bg-gradient-to-b from-[#0B1E33] via-[#081A2A] to-[#040E18]"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            {/* Holographic Security Overlay / Texture */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#FF9900_1px,transparent_1px)] [background-size:12px_12px]"></div>
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#FF9900]/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Front Header */}
            <div className="relative z-10 border-b border-slate-700/60 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <img src="/aws-logo.svg" alt="AWS" className="h-4 w-auto brightness-0 invert" />
                  <span className="text-slate-600 text-[10px]">|</span>
                  <span className="font-display font-extrabold text-[10px] text-white tracking-tight uppercase">
                    AWS SBG CU-UP
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold text-[#FF9900] bg-[#FF9900]/10 border border-[#FF9900]/30 px-2 py-0.5 rounded">
                  STUDENT COMMUNITY
                </span>
              </div>
              <p className="text-[8.5px] text-slate-400 font-medium mt-1">
                Chandigarh University – Uttar Pradesh
              </p>
            </div>

            {/* Front Center: Photo & Primary Credentials */}
            <div className="relative z-10 flex flex-col items-center text-center my-auto space-y-3 py-2">
              {/* Photo Frame with glowing accent */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#FF9900] to-amber-500 rounded-full blur-sm opacity-60"></div>
                <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full border-2 border-[#FF9900] overflow-hidden bg-slate-800 flex items-center justify-center shadow-xl">
                  {identity.photoUrl ? (
                    <img
                      src={identity.photoUrl}
                      alt={identity.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-display font-extrabold text-4xl text-slate-300">
                      {identity.fullName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Name & Role */}
              <div className="space-y-1 w-full px-2">
                <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight leading-tight line-clamp-2">
                  {identity.fullName}
                </h2>
                <p className="text-xs sm:text-sm font-bold text-[#FF9900] tracking-wide line-clamp-1">
                  {identity.role}
                </p>
              </div>

              {/* Member Type Pill */}
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] font-bold text-slate-200 shadow-inner">
                <span>{identity.memberType}</span>
                {identity.domain && (
                  <>
                    <span className="mx-1.5 text-slate-600">•</span>
                    <span className="text-slate-400">{identity.domain}</span>
                  </>
                )}
              </div>
            </div>

            {/* Front Footer: Digital ID Pill & Status */}
            <div className="relative z-10 space-y-3 pt-3 border-t border-slate-700/60">
              <div className="bg-[#040E18]/80 border border-slate-700/80 rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[8px] uppercase tracking-wider font-bold text-slate-400">Digital ID</p>
                  <p className="font-mono font-extrabold text-base sm:text-lg text-white tracking-wider">
                    {identity.publicId}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[8px] uppercase tracking-wider font-bold text-slate-400">Status</p>
                  <span className={`inline-flex items-center space-x-1.5 text-xs font-bold ${
                    isActive ? 'text-emerald-400' : isSuspended ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${
                      isActive ? 'bg-emerald-400 animate-pulse' : isSuspended ? 'bg-amber-400' : 'bg-red-400'
                    }`}></span>
                    <span>{identity.status}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                <span>Issued: {formatDisplayDate(identity.issuedAt || identity.createdAt)}</span>
                <span className="text-[#FF9900] font-semibold">awssbgcuup.tech</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BACK OF CARD (VERIFICATION & QR) */}
          {/* ======================================================== */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl p-6 flex flex-col justify-between overflow-hidden border border-slate-700/60 shadow-2xl bg-gradient-to-b from-[#0B1E33] via-[#081A2A] to-[#040E18]"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#FF9900_1px,transparent_1px)] [background-size:12px_12px]"></div>

            {/* Back Header */}
            <div className="relative z-10 border-b border-slate-700/60 pb-3 text-center">
              <p className="font-display font-extrabold text-xs uppercase tracking-wider text-white">
                Digital ID Verification
              </p>
              <p className="text-[9px] text-[#FF9900] font-semibold">
                Official Live Registry Scanner
              </p>
            </div>

            {/* QR Box in Center */}
            <div className="relative z-10 flex flex-col items-center my-auto space-y-3">
              <div className="p-3 bg-white rounded-xl shadow-xl border-2 border-[#FF9900]/40">
                <img
                  src={qrDataUrl}
                  alt="Verification QR Code"
                  className="h-36 w-36 sm:h-40 sm:w-40 object-contain rounded"
                />
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-[11px] font-bold text-slate-200">Scan to verify this identity</p>
                <p className="text-[9px] text-slate-400 font-mono select-all">
                  {identity.publicId}
                </p>
              </div>
            </div>

            {/* Registry Info & Disclaimer */}
            <div className="relative z-10 space-y-2.5 pt-3 border-t border-slate-700/60 text-center">
              <div className="bg-[#040E18]/70 border border-slate-700/60 rounded-lg p-2.5 text-[9px] text-slate-400 leading-relaxed space-y-1">
                <p className="font-bold text-slate-300">Official Verification URL:</p>
                <p className="text-[#FF9900] font-mono select-all break-all text-[8.5px]">
                  {verificationUrl}
                </p>
                <p className="text-[8px] text-slate-500 pt-1">
                  This Digital ID is valid only while the associated identity remains active in the official verification registry.
                </p>
              </div>

              <div className="flex items-center justify-between text-[8.5px] text-slate-500">
                <span>Status: <strong className={isActive ? 'text-emerald-400' : 'text-red-400'}>{identity.status}</strong></span>
                <span>AWS SBG CU-UP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* QUICK ACTIONS TOOLBAR (Hidden in print) */}
      {/* ======================================================== */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-wrap items-center justify-center gap-2.5 print:hidden">
        {/* PDF Download Button */}
        <a
          href={`/api/digital-ids/pdf/${identity.publicId}`}
          download
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#FF9900] hover:bg-[#EC7211] text-[#081A2A] font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <span>📄 Download PDF Card</span>
        </a>

        {/* Print Card */}
        <button
          onClick={handlePrint}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        >
          <span>🖨️ Print Card</span>
        </button>

        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        >
          <span>{copied ? '✓ Copied!' : '🔗 Copy Link'}</span>
        </button>

        {/* Share Link */}
        <button
          onClick={handleShare}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        >
          <span>↗ Share</span>
        </button>
      </div>

      {/* Legal & Community Disclaimer Footer */}
      <div className="max-w-xl text-center space-y-2 text-[10px] text-slate-500 leading-relaxed border-t border-slate-800/80 pt-6">
        <p>
          This Digital ID Card is issued by the student-led <strong>AWS Student Builder Group</strong> at <strong>Chandigarh University – Uttar Pradesh</strong>. It certifies community participation, leadership, or contribution within the student chapter.
        </p>
        <p>
          It is not an official employee credential or corporate identity issued by Amazon Web Services, Inc.
        </p>
      </div>
    </div>
  );
}
