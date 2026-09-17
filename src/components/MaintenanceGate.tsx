'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import MaintenanceScreen from './MaintenanceScreen';

interface MaintenanceGateProps {
  children: React.ReactNode;
  initialMaintenance?: {
    maintenanceMode: boolean;
    headline: string;
    message: string;
    estimatedReturn?: string;
  };
}

export default function MaintenanceGate({ children, initialMaintenance }: MaintenanceGateProps) {
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState(
    initialMaintenance || {
      maintenanceMode: false,
      headline: 'Website Temporarily Unavailable',
      message: "We're currently performing scheduled maintenance and improvements. Please check back shortly.",
      estimatedReturn: ''
    }
  );
  const [hasAdminSession, setHasAdminSession] = useState(false);

  // Check admin session in browser to allow authenticated admins to browse if needed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('adminToken') || sessionStorage.getItem('admin_token');
      if (token) {
        setHasAdminSession(true);
      }
    }
  }, [pathname]);

  // Periodic polling for maintenance state synchronization
  useEffect(() => {
    let isMounted = true;
    const checkMaintenance = async () => {
      try {
        const res = await fetch('/api/maintenance', { cache: 'no-store' });
        const data = await res.json();
        if (isMounted && typeof data.maintenanceMode === 'boolean') {
          setMaintenance(prev => ({
            ...prev,
            maintenanceMode: data.maintenanceMode,
            headline: data.headline || prev.headline,
            message: data.message || prev.message,
            estimatedReturn: data.estimatedReturn || prev.estimatedReturn
          }));
        }
      } catch (e) {
        // Continue with initial state if check fails
      }
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Admin routes are ALWAYS completely accessible
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    return <>{children}</>;
  }

  // If maintenance mode is active and user is not an authenticated admin
  if (maintenance.maintenanceMode && !hasAdminSession) {
    return (
      <MaintenanceScreen
        headline={maintenance.headline}
        message={maintenance.message}
        estimatedReturn={maintenance.estimatedReturn}
      />
    );
  }

  return <>{children}</>;
}
