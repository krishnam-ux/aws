import { db } from '@/lib/db';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Scheduled Maintenance | AWS Student Builder Group at Chandigarh University – Uttar Pradesh',
  description: 'Scheduled maintenance is currently underway. Please check back shortly.',
  robots: {
    index: false,
    follow: false
  }
};

export default async function MaintenancePage() {
  const settings = await db.maintenanceSettings.getSettings();

  return (
    <MaintenanceScreen
      headline={settings.headline}
      message={settings.message}
      estimatedReturn={settings.estimatedReturn}
    />
  );
}
