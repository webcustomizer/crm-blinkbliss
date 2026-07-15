// components/NetworkStatus.tsx
"use client";

import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import { Capacitor } from "@capacitor/core";

export default function NetworkStatus({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let listenerHandle: any;

    const init = async () => {
      if (Capacitor.isNativePlatform()) {
        // Native: use Capacitor Network plugin
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        setChecked(true);

        listenerHandle = await Network.addListener(
          "networkStatusChange",
          (status) => {
            setIsOnline(status.connected);
          },
        );
      } else {
        // Web fallback
        setIsOnline(navigator.onLine);
        setChecked(true);
        window.addEventListener("online", () => setIsOnline(true));
        window.addEventListener("offline", () => setIsOnline(false));
      }
    };

    init();

    return () => {
      if (listenerHandle) listenerHandle.remove();
      window.removeEventListener("online", () => setIsOnline(true));
      window.removeEventListener("offline", () => setIsOnline(false));
    };
  }, []);

  const handleRetry = async () => {
    if (Capacitor.isNativePlatform()) {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
    } else {
      setIsOnline(navigator.onLine);
    }
  };

  // Avoid flashing "offline" before first check completes
  if (!checked) return <>{children}</>;

  if (!isOnline) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white px-6 text-center">
        <svg
          className="mb-4 h-16 w-16 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900">
          No Internet Connection
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Please check your connection and try again.
        </p>
        <button
          onClick={handleRetry}
          className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
