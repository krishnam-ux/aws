'use client';

import { useEffect, useState } from 'react';

export default function VerifyCertificatePage({ params }: { params: Promise<{ certificateId: string }> }) {
  const [certificateId, setCertificateId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const resolved = await params;
      setCertificateId(resolved.certificateId);
      const res = await fetch(`/api/verify-certificate/${encodeURIComponent(resolved.certificateId)}`);
      const payload = await res.json();
      setData(payload);
      setLoading(false);
    };

    load();
  }, [params]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-700">Loading verification…</div>;
  }

  const isValid = data?.status === 'Valid';
  const isRevoked = data?.status === 'Revoked';
  const isNotFound = data?.status === 'Not Found';

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16 text-slate-800">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl mb-3">{isValid ? '✓' : isRevoked ? '⚠️' : '✕'}</div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isValid ? 'Certificate Verified' : isRevoked ? 'Certificate Revoked' : 'Certificate Not Found'}
          </h1>
        </div>

        {isValid && data && (
          <div className="space-y-4 text-sm">
            <div><strong>Student Name:</strong> {data.studentName}</div>
            <div><strong>Event Name:</strong> {data.eventName}</div>
            <div><strong>Event Date:</strong> {data.eventDate}</div>
            <div><strong>Venue:</strong> {data.venue}</div>
            <div><strong>Certificate ID:</strong> {data.certificateId}</div>
            <div><strong>Issued By:</strong> {data.issuedBy}</div>
            <div><strong>Issue Date:</strong> {data.issueDate}</div>
            <div><strong>Status:</strong> Valid</div>
          </div>
        )}

        {isRevoked && (
          <div className="space-y-3 text-sm">
            <div><strong>Certificate ID:</strong> {data?.certificateId}</div>
            <div><strong>Status:</strong> Revoked</div>
          </div>
        )}

        {isNotFound && (
          <div className="text-center text-sm text-slate-600">This certificate ID could not be found.</div>
        )}

        <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          Verification reference: {certificateId}
        </div>
      </div>
    </main>
  );
}
