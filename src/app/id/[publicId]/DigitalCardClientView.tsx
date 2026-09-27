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
          title: `${identity.fullName} - AWS SBG Digital ID`,
          text: `Official Member Profile for ${identity.fullName} (${identity.publicId}) - AWS Student Builder Group at Chandigarh University – Uttar Pradesh:`,
          url: verificationUrl
        });
      } catch (err) {
        // Share cancelled
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
      {/* Top Header & Breadcrumbs (Hidden in print) */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6 print:hidden">
        <div className="flex items-center space-x-3.5">
          <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
            <img
              src="/aws-logo.svg"
              alt="AWS"
              className="h-5 w-auto brightness-0 invert"
            />
            <span className="text-slate-600 font-bold text-xs">|</span>
            <img
              src="/chandigarh-university-logo.jpg"
              alt="Chandigarh University – Uttar Pradesh"
              className="h-6 w-auto rounded object-contain bg-white p-0.5"
            />
          </div>
          <div>
            <p className="font-extrabold text-xs uppercase tracking-wider text-white">
              AWS Student Builder Group
            </p>
            <p className="text-[11px] text-[#FF9900] font-semibold">
              Chandigarh University – Uttar Pradesh
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href={`/verify/${identity.publicId}`}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
          >
            <span>✓</span>
            <span>Live Registry Record</span>
          </Link>
        </div>
      </div>

      {/* CARD FLIP CONTROLS & INSTRUCTION (Hidden in print) */}
      <div className="flex items-center justify-center space-x-3 print:hidden">
        <button
          type="button"
          onClick={() => setIsFlipped(false)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            !isFlipped
              ? 'bg-[#FF9900] text-[#081A2A] shadow-lg shadow-[#FF9900]/25'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Front Side
        </button>
        <button
          type="button"
          onClick={() => setIsFlipped(true)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            isFlipped
              ? 'bg-[#FF9900] text-[#081A2A] shadow-lg shadow-[#FF9900]/25'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Back Side (QR & Verification)
        </button>
        <span className="text-[11px] text-slate-400 hidden sm:inline ml-2">
          (Click card to flip 3D)
        </span>
      </div>

      {/* 3D INTERACTIVE CARD CONTAINER */}
      <div
        className="w-full max-w-[360px] sm:max-w-[390px] h-[590px] sm:h-[610px] cursor-pointer print:max-w-none print:h-auto select-none"
        style={{ perspective: '1400px' }}
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
            className="absolute inset-0 w-full h-full rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden border border-slate-700/80 shadow-2xl bg-[#081726] text-white"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            {/* Subtle AWS Orange Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FF9900] to-transparent"></div>

            {/* FRONT HEADER */}
            <div className="relative z-10 border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <img
                    src="/aws-logo.svg"
                    alt="AWS"
                    className="h-5 w-auto brightness-0 invert"
                  />
                  <span className="text-slate-600 font-bold text-xs">|</span>
                  <div className="bg-white p-1 rounded-md shadow-sm flex items-center justify-center">
                    <img
                      src="/chandigarh-university-logo.jpg"
                      alt="Chandigarh University – Uttar Pradesh"
                      className="h-5 w-auto object-contain max-w-[90px]"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-mono font-bold text-[#FF9900] bg-[#FF9900]/10 border border-[#FF9900]/30 px-2 py-0.5 rounded-md">
                    STUDENT CHAPTER
                  </span>
                </div>
              </div>

              <div className="mt-2.5">
                <h1 className="font-extrabold text-xs tracking-wider uppercase text-white">
                  AWS Student Builder Group
                </h1>
                <p className="text-[10px] text-[#FF9900] font-semibold tracking-normal">
                  Chandigarh University – Uttar Pradesh
                </p>
              </div>
            </div>

            {/* FRONT CENTER: MEMBER PHOTOGRAPH & CREDENTIALS */}
            <div className="relative z-10 flex flex-col items-center text-center my-auto space-y-3 py-1">
              {/* Professional Photo Frame with crisp border */}
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-[#FF9900] overflow-hidden bg-slate-900 shadow-xl flex items-center justify-center">
                  {identity.photoUrl ? (
                    <img
                      src={identity.photoUrl}
                      alt={identity.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-extrabold text-3xl sm:text-4xl text-[#FF9900]">
                      {identity.fullName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Large Readable Member Name */}
              <div className="space-y-0.5 w-full px-2">
                <h2 className="font-extrabold text-xl sm:text-2xl text-white tracking-tight leading-tight line-clamp-2">
                  {identity.fullName}
                </h2>
                {/* Role / Designation */}
                <p className="text-sm sm:text-base font-bold text-[#FF9900] tracking-wide line-clamp-1">
                  {identity.role}
                </p>
                {/* Team / Domain */}
                <p className="text-xs text-slate-300 font-medium">
                  {identity.domain || 'Cloud & Emerging Tech'}
                </p>
              </div>
            </div>

            {/* FRONT LOWER: HIGHLIGHTED MEMBER ID & STATUS */}
            <div className="relative z-10 space-y-2.5 pt-2">
              {/* Dedicated Highlighted Section for Member ID */}
              <div className="bg-[#040E18] border border-[#FF9900]/40 rounded-xl p-3 flex items-center justify-between shadow-inner">
                <div>
                  <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                    Member ID
                  </p>
                  <p className="font-mono font-extrabold text-base sm:text-lg text-white tracking-wider">
                    {identity.publicId}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                      isActive
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : isSuspended
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                        : 'bg-red-500/15 border border-red-500/30 text-red-400'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-400 animate-pulse'
                          : isSuspended
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                    ></span>
                    <span>{isActive ? 'ACTIVE MEMBER' : identity.status}</span>
                  </span>
                </div>
              </div>

              {/* MINIMAL FOOTER */}
              <div className="border-t border-slate-800/80 pt-2 text-center">
                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Student Community Membership ID
                </p>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BACK OF CARD (QR & VERIFICATION) */}
          {/* ======================================================== */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden border border-slate-700/80 shadow-2xl bg-[#081726] text-white"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {/* Subtle AWS Orange Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FF9900] to-transparent"></div>

            {/* BACK HEADER */}
            <div className="relative z-10 border-b border-slate-800 pb-2.5 text-center">
              <h2 className="font-extrabold text-xs uppercase tracking-wider text-white">
                DIGITAL MEMBER VERIFICATION
              </h2>
              <p className="text-[9.5px] text-[#FF9900] font-semibold mt-0.5">
                Official Verification Registry • Scannable QR
              </p>
            </div>

            {/* BACK CENTER: PROMINENT SCANNABLE QR CODE */}
            <div className="relative z-10 flex flex-col items-center my-auto space-y-2 py-1">
              <div className="p-3 bg-white rounded-2xl shadow-2xl border-2 border-[#FF9900]/50">
                <img
                  src={qrDataUrl}
                  alt="Verification QR Code"
                  className="h-32 w-32 sm:h-36 sm:w-36 object-contain"
                />
              </div>
              <p className="text-[10px] font-semibold text-slate-300">
                Scan with any device camera to verify
              </p>
            </div>

            {/* BACK LOWER: MEMBER METADATA & MANDATORY STATEMENT */}
            <div className="relative z-10 space-y-2.5">
              {/* Structured Key-Value Details */}
              <div className="bg-[#040E18] border border-slate-800 rounded-xl p-2.5 text-[10px] space-y-1">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-semibold">Member ID:</span>
                  <span className="font-mono font-bold text-white select-all">{identity.publicId}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-semibold">Member Name:</span>
                  <span className="font-bold text-white truncate max-w-[190px]">{identity.fullName}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-semibold">Role:</span>
                  <span className="font-bold text-[#FF9900] truncate max-w-[190px]">{identity.role}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-semibold">Team / Domain:</span>
                  <span className="font-medium text-slate-200 truncate max-w-[190px]">{identity.domain || 'Cloud & Emerging Tech'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-semibold">Membership Status:</span>
                  <span className={`font-bold ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {identity.status}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                  <span className="text-slate-400 font-semibold">Issue Date:</span>
                  <span className="font-medium text-slate-300">
                    {formatDisplayDate(identity.issuedAt || identity.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-400 font-semibold">Verification URL:</span>
                  <span className="font-mono text-[9px] text-[#FF9900] truncate max-w-[180px]">
                    {verificationUrl.replace(/^https?:\/\//, '')}
                  </span>
                </div>
              </div>

              {/* Mandatory Official Verification Statement */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-[9px] text-slate-300 leading-relaxed text-center">
                “This card identifies the holder as a registered member of the AWS Student Builder Group at Chandigarh University – Uttar Pradesh. Membership can be verified through the official verification URL or QR code.”
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS TOOLBAR (Hidden in print) */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-center gap-2.5 print:hidden">
        {/* PDF Download Button */}
        <a
          href={`/api/digital-ids/pdf/${identity.publicId}`}
          download
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#FF9900] hover:bg-[#EC7211] text-[#081A2A] font-bold text-xs shadow-md shadow-[#FF9900]/20 transition-all cursor-pointer"
        >
          <span>📄 Download Official PDF</span>
        </a>

        {/* Print Card */}
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        >
          <span>🖨️ Print Card</span>
        </button>

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        >
          <span>{copied ? '✓ Link Copied!' : '🔗 Copy Link'}</span>
        </button>

        {/* Share Link */}
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
        >
          <span>↗ Share</span>
        </button>
      </div>

      {/* Community Disclaimer Footer */}
      <div className="max-w-xl text-center space-y-1.5 text-[10px] text-slate-400 leading-relaxed border-t border-slate-800 pt-6">
        <p>
          This Digital ID Card is issued by the student-led <strong>AWS Student Builder Group</strong> at <strong>Chandigarh University – Uttar Pradesh</strong> for registered community members.
        </p>
        <p className="text-slate-400">
          This is a student community membership credential, not an official Amazon Web Services corporate employee ID or certification.
        </p>
      </div>
    </div>
  );
}
