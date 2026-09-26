import { Metadata } from 'next';
import AdminDigitalBadgesManager from '@/components/AdminDigitalBadgesManager';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Digital Badges & Credentials | Admin Portal | AWS SBG CU-UP',
  description: 'Official Digital Badge registry, issuance, and verification system.'
};

export default function AdminDigitalBadgesPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb / Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <Link href="/admin" className="hover:text-slate-900 transition-colors">
              Admin Portal
            </Link>
            <span>/</span>
            <span className="text-slate-900">People &amp; Identity</span>
            <span>/</span>
            <span className="text-[#FF9900]">Digital Badges</span>
          </div>

          <Link
            href="/admin"
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            ← Back to Main Dashboard
          </Link>
        </div>

        {/* Manager Component */}
        <AdminDigitalBadgesManager />
      </div>
    </div>
  );
}
