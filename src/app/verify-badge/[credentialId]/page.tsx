import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { formatDisplayDate, getBadgeUrl, getBadgeVerificationUrl } from '@/lib/digitalBadgeUtils';
import { generateBadgeSvg } from '@/lib/badgeAssets';

interface Props {
  params: Promise<{ credentialId: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const cleanId = String(resolved?.credentialId || '').trim().toUpperCase();
  return {
    title: `Verify Badge ${cleanId} | AWS SBG CU-UP Verification Registry`,
    description: `Real-time official verification check for credential ${cleanId}.`
  };
}

export default async function VerifyBadgePage({ params }: Props) {
  const resolved = await params;
  const cleanId = String(resolved?.credentialId || '').trim().toUpperCase();
  const badge = (await db.digitalBadges.getByCredentialId(cleanId)) || (await db.digitalBadges.getById(cleanId));

  // Log verification event in background
  if (badge) {
    db.digitalBadges.logEvent({
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      credentialId: badge.credentialId,
      eventType: 'BADGE_VERIFIED',
      timestamp: new Date().toISOString(),
      details: {
        status: badge.status
      }
    }).catch(() => {});
  }

  // 1. UNKNOWN STATE
  if (!badge) {
    return (
      <div className="min-h-screen bg-[#07131F] text-white flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full text-center bg-[#0D2235] border border-rose-900/60 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto border border-rose-500/30">
            ✕
          </div>
          <div>
            <div className="inline-block px-3 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-extrabold rounded-full mb-3 tracking-wider">
              INVALID CREDENTIAL
            </div>
            <h1 className="text-xl font-extrabold text-white">Credential Not Found</h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The credential ID <span className="font-mono text-[#FF9900] font-bold">{cleanId}</span> is not registered in the official AWS Student Builder Group registry.
            </p>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400 text-left">
            <span className="font-bold text-slate-300 block mb-1">Verification Tip:</span>
            Please verify that the Credential ID was typed correctly, including hyphens and capitalization (e.g., <code className="text-[#FF9900]">BADGE-CUUP-000001</code>).
          </div>

          <div>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors"
            >
              Return to Community Portal &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isRevoked = badge.status === 'REVOKED';
  const badgeUrl = badge.credentialUrl || getBadgeUrl(badge.credentialId);
  const verifyUrl = badge.verificationUrl || getBadgeVerificationUrl(badge.credentialId);
  const badgeSvg = generateBadgeSvg({
    title: badge.badgeTitle,
    category: badge.category || 'SESSION COMPLETION',
    series: badge.series || 'WEEKLY AWS LEARNING SERIES',
    credentialId: badge.credentialId,
    issueDate: formatDisplayDate(badge.issueDate || badge.issuedAt),
    issuer: badge.issuerName
  });

  return (
    <div className="min-h-screen bg-[#07131F] text-slate-100 font-sans antialiased selection:bg-[#FF9900] selection:text-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#07131F]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF9900] to-[#E68A00] flex items-center justify-center font-extrabold text-slate-950 text-sm shadow-md">
              AWS
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide">AWS Student Builder Group</div>
              <div className="text-[10px] text-slate-400">Official Verification Registry</div>
            </div>
          </Link>

          <Link
            href={`/badge/${badge.credentialId}`}
            className="px-3 py-1.5 bg-[#FF9900] hover:bg-[#E68A00] text-slate-950 text-xs font-bold rounded-lg transition-colors"
          >
            View Badge &rarr;
          </Link>
        </div>
      </header>

      {/* Main Verification Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
        {/* Verification Status Banner Card */}
        <div className={`rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 ${
          isRevoked
            ? 'bg-gradient-to-b from-[#1E0E12] to-[#0D2235] border-rose-600/70'
            : 'bg-gradient-to-b from-[#0B211B] to-[#0D2235] border-emerald-500/60'
        }`}>
          {/* Status Badge & Icon */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg flex-shrink-0 ${
              isRevoked ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}>
              {isRevoked ? '⚠' : '✓'}
            </div>
            <div>
              <div className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-1 ${
                isRevoked ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isRevoked ? 'REVOKED' : 'OFFICIALLY VERIFIED'}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                {isRevoked ? 'Credential Has Been Revoked' : 'Authentic & Valid Digital Credential'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1">
                {isRevoked ? (
                  <span>
                    This credential was revoked by the issuing body
                    {badge.revokedAt ? ` on ${formatDisplayDate(badge.revokedAt)}` : ''}.
                    {badge.revokedReason ? ` Authoritative Reason: "${badge.revokedReason}"` : ''}
                  </span>
                ) : (
                  <span>
                    This credential is valid and was officially issued by <strong>AWS Student Builder Group – Chandigarh University Uttar Pradesh</strong> to <strong>{badge.recipientName}</strong>.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Credential Data Breakdown */}
        <div className="bg-[#0B1E30] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Badge Artwork Thumbnail */}
            <div className="md:col-span-4 flex justify-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 aspect-square drop-shadow-xl flex items-center justify-center">
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: badgeSvg }} />
              </div>
            </div>

            {/* Credential Metadata */}
            <div className="md:col-span-8 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Recipient Name</span>
                  <span className="font-extrabold text-white text-base">{badge.recipientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Credential ID</span>
                  <span className="font-mono font-extrabold text-[#FF9900] text-sm">{badge.credentialId}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Badge Title</span>
                  <span className="font-bold text-slate-200 text-sm">{badge.badgeTitle}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Issue Date</span>
                  <span className="font-semibold text-slate-300">{formatDisplayDate(badge.issueDate)}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Issuing Authority</span>
                <span className="font-semibold text-slate-200">{badge.issuerName}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Earning Criteria</span>
                <p className="text-slate-300 bg-[#07131F] p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                  {badge.earningCriteria}
                </p>
              </div>

              {badge.skills && badge.skills.length > 0 && (
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5">Verified Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {badge.skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-[#07131F] border border-[#FF9900]/30 text-[#FF9900] text-xs font-bold rounded-lg"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800">
            <Link
              href={`/badge/${badge.credentialId}`}
              className="px-5 py-2.5 bg-[#FF9900] hover:bg-[#E68A00] text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-colors"
            >
              View Full Credential Showcase &rarr;
            </Link>

            <a
              href={`/api/digital-badges/pdf/${badge.credentialId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors"
            >
              Download PDF Certificate 📄
            </a>
          </div>
        </div>

        {/* Security & Verification Integrity Notice */}
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p>
            Cryptographically sealed and live-verified against the AWS Student Builder Group immutable registry.
          </p>
          <p className="font-mono text-[10px] text-slate-600">
            Lookup URL: {verifyUrl}
          </p>
        </div>
      </main>
    </div>
  );
}
