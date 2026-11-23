import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AWS Card Clash: Security Island Contest | AWS Student Builder Group',
  description: 'Defend the cloud on the Security Island in AWS Card Clash. Win an AWS Certified AI Practitioner exam voucher! Join the contest now with event code 515553.',
  openGraph: {
    title: 'AWS Card Clash: Security Island Contest',
    description: 'Defend the cloud on the Security Island in AWS Card Clash. Win an AWS Certified AI Practitioner exam voucher! Event code 515553.',
    images: ['/contest/hero-visual-full.png'],
  }
};

export default function ContestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-contest="" className="w-full min-h-screen bg-[#0B0908] text-[#F8F2EA]">
      {children}
    </div>
  );
}
