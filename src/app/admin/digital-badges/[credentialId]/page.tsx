import { Metadata } from 'next';
import AdminDigitalBadgesManager from '@/components/AdminDigitalBadgesManager';
import Link from 'next/link';

interface Props {
  params: Promise<{ credentialId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const credentialId = String(resolved?.credentialId || '').toUpperCase();
  return {
    title: `Badge ${credentialId} | Admin Portal | AWS SBG CU-UP`,
    description: `Administrative details and verification history for credential ${credentialId}.`
  };
}

export default async function AdminDigitalBadgeDetailPage({ params }: Props) {
  const resolved = await params;
  const credentialId = String(resolved?.credentialId || '').toUpperCase();

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <Link href="/admin" className="hover:text-slate-900 transition-colors">
              Admin Portal
            </Link>
            <span>/</span>
            <Link href="/admin/digital-badges" className="hover:text-slate-900 transition-colors">
              Digital Badges
            </Link>
            <span>/</span>
            <span className="text-[#FF9900] font-mono">{credentialId}</span>
          </div>

          <Link
            href="/admin/digital-badges"
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            ← Back to Badges List
          </Link>
        </div>

        <AdminDigitalBadgesManager />
      </div>
    </div>
  );
}
