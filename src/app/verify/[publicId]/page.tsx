import { Metadata } from 'next';
import { db } from '@/lib/db';
import { formatDisplayDate, getCardUrl, getVerificationUrl } from '@/lib/digitalIdUtils';
import VerificationClientActions from './VerificationClientActions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ publicId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const cleanId = String(publicId || '').trim().toUpperCase();
  const identity = await db.digitalIdentities.getByPublicId(cleanId);

  if (!identity) {
    return {
      title: 'Verification Failed | Digital ID Not Found | AWS SBG CU-UP',
      description: 'The requested Digital ID could not be verified against the official registry.'
    };
  }

  const isVerified = identity.status === 'ACTIVE';
  return {
    title: `${isVerified ? '✓ Verified Identity' : identity.status} - ${identity.fullName} (${identity.publicId}) | AWS SBG CU-UP`,
    description: `Official Live Verification for ${identity.fullName} (${identity.role}) - Status: ${identity.status}. Verified against the official community registry at Chandigarh University – Uttar Pradesh.`,
    openGraph: {
      title: `${identity.fullName} - ${identity.status} Digital ID`,
      description: `${identity.publicId} • ${identity.role} • AWS Student Builder Group CU-UP`,
      images: identity.photoUrl ? [{ url: identity.photoUrl }] : undefined
    }
  };
}

export default async function PublicVerificationPage({ params }: PageProps) {
  const { publicId } = await params;
  const cleanId = String(publicId || '').trim().toUpperCase();
  const identity = await db.digitalIdentities.getByPublicId(cleanId);

  // Asynchronously log verification attempt
  if (cleanId) {
    db.digitalIdVerifications.logVerification({
      digitalId: cleanId,
      timestamp: new Date().toISOString(),
      result: identity ? (identity.status === 'ACTIVE' ? 'VERIFIED' : identity.status) : 'NOT_FOUND',
      deviceType: 'Web Client',
      browser: 'Web'
    }).catch(err => console.error('Error in verification logging:', err));
  }

  const isActive = identity && identity.status === 'ACTIVE';
  const isSuspended = identity && identity.status === 'SUSPENDED';
  const isRevoked = identity && identity.status === 'REVOKED';
  const notFound = !identity;

  return (
    <div className="min-h-screen bg-[#081A2A] text-slate-100 font-sans selection:bg-[#FF9900] selection:text-[#081A2A]">
      {/* Background Ambience / Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-[#FF9900]/10 via-[#0073BB]/5 to-transparent blur-3xl opacity-70"></div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 sm:py-14 flex flex-col items-center space-y-8">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center space-x-3 justify-center">
            <img src="/aws-logo.svg" alt="AWS" className="h-7 w-auto brightness-0 invert" />
            <span className="text-slate-600 text-lg">|</span>
            <img src="/chandigarh-university-logo.jpg" alt="Chandigarh University" className="h-8 w-auto rounded object-contain bg-white/10 p-0.5" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
              AWS Student Builder Group
            </h2>
            <p className="text-xs text-[#FF9900] font-semibold">
              Chandigarh University – Uttar Pradesh
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STATE 1: ACTIVE & VERIFIED IDENTITY */}
        {/* ======================================================== */}
        {isActive && identity && (
          <div className="w-full bg-gradient-to-b from-slate-900 to-[#0A1F33] rounded-2xl border border-emerald-500/40 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden animate-scaleUp">
            {/* Top Emerald Glow */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400"></div>

            {/* Verification Status Badge */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-display font-extrabold text-xs tracking-wide shadow-sm">
                <span className="text-sm">✓</span>
                <span>VERIFIED IDENTITY</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official Digital Identity Record • Live Verification Confirmed
              </p>
            </div>

            {/* Profile Credentials Display */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 bg-slate-800/60 p-5 rounded-xl border border-slate-700/60">
              {/* Profile Photo */}
              <div className="relative flex-shrink-0">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-emerald-500/80 overflow-hidden bg-slate-900 flex items-center justify-center shadow-lg">
                  {identity.photoUrl ? (
                    <img
                      src={identity.photoUrl}
                      alt={identity.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-display font-extrabold text-3xl text-emerald-400">
                      {identity.fullName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-slate-950 font-bold text-xs" title="Verified Member">
                  ✓
                </div>
              </div>

              {/* Name, Role & Details */}
              <div className="space-y-2 text-center sm:text-left flex-grow">
                <div>
                  <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight leading-tight">
                    {identity.fullName}
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-[#FF9900] mt-0.5">
                    {identity.role}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/80 text-slate-200 border border-slate-600">
                    {identity.memberType}
                  </span>
                  {identity.domain && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700/50 text-slate-300">
                      {identity.domain}
                    </span>
                  )}
                </div>

                {/* Digital ID & Issued Row */}
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-700/50 mt-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Digital ID</span>
                    <span className="font-mono font-extrabold text-sm text-white select-all">
                      {identity.publicId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Issued On</span>
                    <span className="font-medium text-slate-300">
                      {formatDisplayDate(identity.issuedAt || identity.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Registry Statement */}
            <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4 text-center space-y-1 text-xs">
              <p className="font-bold text-emerald-400">
                Official Registry Statement:
              </p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                &ldquo;This identity was verified against the official Digital ID registry of AWS Student Builder Group at Chandigarh University – Uttar Pradesh.&rdquo;
              </p>
            </div>

            {/* Interactive Actions (View Card, Share, Copy Link) */}
            <VerificationClientActions
              publicId={identity.publicId}
              fullName={identity.fullName}
              cardUrl={getCardUrl(identity.publicId)}
              verificationUrl={getVerificationUrl(identity.publicId)}
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* STATE 2: SUSPENDED ID */}
        {/* ======================================================== */}
        {isSuspended && identity && (
          <div className="w-full bg-gradient-to-b from-slate-900 to-[#1F1707] rounded-2xl border border-amber-500/40 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden animate-scaleUp">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500"></div>

            <div className="flex flex-col items-center text-center space-y-2">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-display font-extrabold text-xs tracking-wide">
                <span className="text-sm">⚠</span>
                <span>ID CURRENTLY SUSPENDED</span>
              </div>
              <p className="text-xs text-slate-300">
                This Digital ID is temporarily inactive.
              </p>
            </div>

            <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700/60 text-center space-y-3">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-lg text-slate-300 line-through">
                  {identity.fullName}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {identity.publicId} • {identity.memberType}
                </p>
              </div>

              <p className="text-xs text-amber-300/90 leading-relaxed bg-amber-950/30 p-3 rounded-lg border border-amber-500/20">
                This identity record is temporarily suspended by administrative review and is not currently verified for active community status.
              </p>
            </div>

            <div className="text-center pt-2">
              <Link href="/verify" className="text-xs text-[#FF9900] hover:underline font-semibold">
                ← Verify Another Digital ID
              </Link>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STATE 3: REVOKED ID */}
        {/* ======================================================== */}
        {isRevoked && identity && (
          <div className="w-full bg-gradient-to-b from-slate-900 to-[#260A0A] rounded-2xl border border-red-500/40 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden animate-scaleUp">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500"></div>

            <div className="flex flex-col items-center text-center space-y-2">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-display font-extrabold text-xs tracking-wide">
                <span className="text-sm">✕</span>
                <span>DIGITAL ID REVOKED</span>
              </div>
              <p className="text-xs text-slate-300">
                This Digital ID is no longer active.
              </p>
            </div>

            <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700/60 text-center space-y-3">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-lg text-slate-400 line-through">
                  {identity.fullName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {identity.publicId} • {identity.memberType}
                </p>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 p-3 rounded-lg text-xs text-red-300 leading-relaxed space-y-1">
                <p className="font-bold">Permanent Revocation Record:</p>
                <p>This credential has been formally revoked from the official community verification registry and cannot be used for verification.</p>
                {identity.revokedAt && (
                  <p className="text-[10px] text-slate-400 pt-1">
                    Revoked on: {formatDisplayDate(identity.revokedAt)}
                  </p>
                )}
              </div>
            </div>

            <div className="text-center pt-2">
              <Link href="/verify" className="text-xs text-[#FF9900] hover:underline font-semibold">
                ← Verify Another Digital ID
              </Link>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STATE 4: NOT FOUND / UNKNOWN ID */}
        {/* ======================================================== */}
        {notFound && (
          <div className="w-full bg-gradient-to-b from-slate-900 to-[#180A0A] rounded-2xl border border-red-500/30 shadow-2xl p-6 sm:p-8 space-y-6 text-center animate-scaleUp">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-display font-extrabold text-xs tracking-wide">
              <span>✕</span>
              <span>VERIFICATION FAILED</span>
            </div>

            <div className="space-y-2">
              <h1 className="font-display font-extrabold text-xl text-white">
                Digital ID Not Found
              </h1>
              <p className="font-mono text-sm text-red-400 font-bold">{cleanId || 'UNKNOWN'}</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed pt-2">
                &ldquo;This Digital ID could not be verified against the official registry of AWS Student Builder Group at Chandigarh University – Uttar Pradesh.&rdquo;
              </p>
            </div>

            {/* Search Box to Lookup Another ID */}
            <form action="/verify" method="GET" className="max-w-sm mx-auto flex items-center space-x-2 pt-2">
              <input
                type="text"
                name="id"
                placeholder="Enter Digital ID (e.g. CT-CUUP-001)"
                className="flex-grow px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#FF9900]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#FF9900] hover:bg-[#EC7211] text-[#081A2A] font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Verify
              </button>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-500 space-y-1">
          <p>Official Verification Registry • AWS Student Builder Group CU-UP</p>
          <p>To report discrepancies or request identity validation, contact community coordinators.</p>
        </div>
      </div>
    </div>
  );
}
