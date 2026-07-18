'use client';

import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      console.log('📶 Back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📴 Offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-600 text-white py-2 px-4 text-center text-sm">
      <span className="inline-flex items-center gap-2">
        <span className="text-xl">📶</span>
        You\'re offline. Using cached data.
      </span>
    </div>
  );
}
