import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { formatDisplayDate, getBadgeUrl, getBadgeVerificationUrl } from '@/lib/digitalBadgeUtils';
import { generateBadgeSvg } from '@/lib/badgeAssets';
import PublicBadgeClient from './PublicBadgeClient';

interface Props {
  params: Promise<{ credentialId: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const cleanId = String(resolved?.credentialId || '').trim().toUpperCase();
  const badge = (await db.digitalBadges.getByCredentialId(cleanId)) || (await db.digitalBadges.getById(cleanId));

  if (!badge) {
    return {
      title: 'Credential Not Found | AWS SBG CU-UP',
      description: 'The requested digital credential could not be found in the official verification registry.'
    };
  }

  const isRevoked = badge.status === 'REVOKED';
  const statusLabel = isRevoked ? '[REVOKED]' : '[VERIFIED]';

  return {
    title: `${statusLabel} ${badge.badgeTitle} – ${badge.recipientName} | AWS SBG CU-UP`,
    description: `Official digital credential issued to ${badge.recipientName} for ${badge.badgeTitle}. Credential ID: ${badge.credentialId}.`,
    openGraph: {
      title: `${badge.recipientName} earned ${badge.badgeTitle}`,
      description: `Verified by AWS Student Builder Group – Chandigarh University Uttar Pradesh. Credential ID: ${badge.credentialId}.`,
      url: getBadgeUrl(badge.credentialId),
      siteName: 'AWS Student Builder Group – CU-UP'
    }
  };
}

export default async function PublicBadgePage({ params }: Props) {
  const resolved = await params;
  const cleanId = String(resolved?.credentialId || '').trim().toUpperCase();
  const badge = (await db.digitalBadges.getByCredentialId(cleanId)) || (await db.digitalBadges.getById(cleanId));

  if (!badge) {
    return (
      <div className="min-h-screen bg-[#07131F] text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center bg-[#0D2235] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto border border-rose-500/30">
            ✕
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Credential Not Found</h1>
            <p className="text-xs text-slate-400 mt-2 font-mono">
              The credential ID <span className="text-[#FF9900]">{cleanId}</span> does not exist in the official AWS Student Builder Group registry.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-6 py-2.5 bg-[#FF9900] hover:bg-[#E68A00] text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
            >
              Return to Community Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Log viewed event in background
  db.digitalBadges.logEvent({
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    credentialId: badge.credentialId,
    eventType: 'BADGE_VIEWED',
    timestamp: new Date().toISOString()
  }).catch(() => {});

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF9900] to-[#E68A00] flex items-center justify-center font-extrabold text-slate-950 text-sm shadow-md">
              AWS
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide">AWS Student Builder Group</div>
              <div className="text-[10px] text-slate-400">Chandigarh University &bull; Uttar Pradesh</div>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              href={`/verify-badge/${badge.credentialId}`}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
            >
              <span>✓</span>
              <span>Verify Status</span>
            </Link>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:inline-block"
            >
              Home &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Credential Showcase */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <PublicBadgeClient badge={badge} badgeSvg={badgeSvg} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#050E17] py-8 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-400">
            Official Credential Verification Registry &bull; AWS Student Builder Group CU-UP
          </p>
          <p className="text-[11px] text-slate-600">
            This digital credential is permanently recorded and cryptographically verifiable.
          </p>
        </div>
      </footer>
    </div>
  );
}
