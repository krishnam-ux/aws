import { Metadata } from 'next';
import AdminDigitalBadgesManager from '@/components/AdminDigitalBadgesManager';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Issue Digital Badge | Admin Portal | AWS SBG CU-UP',
  description: 'Issue official verified digital badges for AWS community members.'
};

export default function IssueNewDigitalBadgePage() {
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
            <span className="text-[#FF9900]">Issue New Badge</span>
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
