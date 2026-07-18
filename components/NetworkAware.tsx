'use client';

import { useEffect, useState } from 'react';
import { getNetworkInfo, isSlowConnection, onNetworkChange, type NetworkInfo } from '@/lib/network-detector';

interface NetworkAwareProps {
  children: React.ReactNode;
}

export function NetworkAware({ children }: NetworkAwareProps) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Set initial network info
    setNetworkInfo(getNetworkInfo());

    // Subscribe to network changes
    const unsubscribe = onNetworkChange((info) => {
      setNetworkInfo(info);
      if (!info.online) {
        setShowWarning(true);
      } else if (isSlowConnection()) {
        console.warn('⚠️ Slow connection detected. Images may load slower.');
      } else {
        setShowWarning(false);
      }
    });

    return unsubscribe;
  }, []);

  if (!networkInfo) return children;

  return (
    <>
      {showWarning && !networkInfo.online && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-3 mb-4">
          <p className="font-bold">⚠️ Connection Issues</p>
          <p className="text-sm">You may experience slower loading times.</p>
        </div>
      )}
      {children}
    </>
  );
}
