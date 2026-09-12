'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FoundingMemberTokenRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/founding-members/form');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#07131F] text-slate-100 flex items-center justify-center p-6 text-center font-sans">
      <div className="bg-[#0D2235]/90 border border-white/10 rounded-2xl p-8 max-w-md w-full space-y-4 shadow-2xl backdrop-blur-xl">
        <div className="inline-block animate-spin h-8 w-8 border-3 border-[#FF9900] border-t-transparent rounded-full" />
        <h2 className="text-base font-bold text-white">Redirecting to Founding Members Form...</h2>
        <p className="text-xs text-slate-400">
          We have updated to a single shared registration form for all Founding Members.
        </p>
      </div>
    </div>
  );
}
