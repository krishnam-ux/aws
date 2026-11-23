import { Metadata } from 'next';
import AdminTeamAssessmentManager from '@/components/AdminTeamAssessmentManager';
import AdminAuthGuard from '@/components/AdminAuthGuard';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Team Work & Contribution Review | Admin Portal | AWS SBG CU-UP',
  description: 'Internal Team Performance & Contribution Assessment evaluation and review dashboard.'
};

export default function AdminTeamAssessmentPage() {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#F6F8FA] text-slate-900 font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Navigation Breadcrumb / Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
              <Link href="/admin" className="hover:text-slate-900 transition-colors">
                Admin Portal
              </Link>
              <span>/</span>
              <span className="text-slate-900">Assessments</span>
              <span>/</span>
              <span className="text-[#FF9900]">Team Work Assessment</span>
            </div>

            <Link
              href="/admin"
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              ← Back to Main Dashboard
            </Link>
          </div>

          {/* Manager Component */}
          <AdminTeamAssessmentManager />
        </div>
      </div>
    </AdminAuthGuard>
  );
}
