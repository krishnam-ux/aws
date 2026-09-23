'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifySearchClient() {
  const router = useRouter();
  const [searchId, setSearchId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchId.trim().toUpperCase();
    if (!clean) return;
    setIsLoading(true);
    router.push(`/verify/${encodeURIComponent(clean)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-grow">
        <input
          type="text"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="e.g. CT-CUUP-001 or FMB-CUUP-005"
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-transparent transition-all uppercase"
          required
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
          🔍
        </span>
      </div>

      <button
        type="submit"
        disabled={isLoading || !searchId.trim()}
        className="px-6 py-3 bg-[#FF9900] hover:bg-[#EC7211] disabled:opacity-50 text-[#081A2A] font-display font-bold text-sm rounded-xl shadow-lg hover:shadow-[#FF9900]/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span>Searching...</span>
        ) : (
          <>
            <span>Verify Status</span>
            <span>→</span>
          </>
        )}
      </button>
    </form>
  );
}
