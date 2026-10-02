'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const savedToken =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('adminToken') || localStorage.getItem('admin_token')
          : null;

      if (!savedToken) {
        if (isMounted) {
          setIsAuthenticated(false);
          router.replace(`/admin?redirect=${encodeURIComponent(pathname || '/admin')}`);
        }
        return;
      }

      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${savedToken}`
          },
          body: JSON.stringify({ action: 'verify_token' })
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && (data.success || data.valid)) {
            if (isMounted) setIsAuthenticated(true);
            return;
          }
        }

        // Invalid or expired token
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('admin_token');
        localStorage.removeItem('admin_token');
        document.cookie = 'admin_token=; path=/; max-age=0';
        document.cookie = 'adminToken=; path=/; max-age=0';

        if (isMounted) {
          setIsAuthenticated(false);
          router.replace(`/admin?redirect=${encodeURIComponent(pathname || '/admin')}`);
        }
      } catch (err) {
        if (isMounted) {
          setIsAuthenticated(false);
          router.replace(`/admin?redirect=${encodeURIComponent(pathname || '/admin')}`);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex flex-col items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#FF9900] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
            Verifying Admin Authorization...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
