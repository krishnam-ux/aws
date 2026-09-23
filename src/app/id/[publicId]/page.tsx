import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { formatDisplayDate, getVerificationUrl, generateQrCodeDataUrl } from '@/lib/digitalIdUtils';
import DigitalCardClientView from './DigitalCardClientView';

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
      title: 'Digital ID Not Found | AWS SBG CU-UP',
      description: 'The requested Digital ID Card could not be found in the official registry.'
    };
  }

  return {
    title: `${identity.fullName} | Official Digital ID Card | AWS SBG CU-UP`,
    description: `Official Digital Identity Card for ${identity.fullName} (${identity.role}) - ${identity.publicId} at AWS Student Builder Group, Chandigarh University – Uttar Pradesh.`,
    openGraph: {
      title: `${identity.fullName} | Digital ID Card`,
      description: `Official Community Identity: ${identity.publicId} • ${identity.role}`,
      images: identity.photoUrl ? [{ url: identity.photoUrl }] : undefined
    }
  };
}

export default async function DigitalCardPage({ params }: PageProps) {
  const { publicId } = await params;
  const cleanId = String(publicId || '').trim().toUpperCase();
  const identity = await db.digitalIdentities.getByPublicId(cleanId);

  if (!identity) {
    notFound();
  }

  const qrDataUrl = await generateQrCodeDataUrl(identity.publicId);
  const verificationUrl = getVerificationUrl(identity.publicId);

  return (
    <div className="min-h-screen bg-[#081A2A] text-slate-100 font-sans selection:bg-[#FF9900] selection:text-[#081A2A]">
      {/* Background Ambience / Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#FF9900]/10 via-[#0073BB]/5 to-transparent blur-3xl opacity-60"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#FF9900]/5 blur-3xl rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
        {/* Interactive Client Card Component */}
        <DigitalCardClientView
          identity={identity}
          qrDataUrl={qrDataUrl}
          verificationUrl={verificationUrl}
        />
      </div>
    </div>
  );
}
