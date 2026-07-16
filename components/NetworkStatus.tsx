// components/NetworkStatus.tsx
"use client";

import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import { Capacitor } from "@capacitor/core";
<<<<<<< HEAD
import { WifiOff } from "lucide-react";
=======
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3

export default function NetworkStatus({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
<<<<<<< HEAD
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listenerHandle: any;

    // Named references so we can actually remove the exact same
    // listener we added — inline arrow functions can't be removed
    // this way, they only look like they can.
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const init = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // Native: use Capacitor Network plugin
          const status = await Network.getStatus();
          setIsOnline(status.connected);

          listenerHandle = await Network.addListener(
            "networkStatusChange",
            (status) => {
              setIsOnline(status.connected);
            },
          );
        } else {
          // Web fallback
          setIsOnline(navigator.onLine);
          window.addEventListener("online", handleOnline);
          window.addEventListener("offline", handleOffline);
        }
      } catch (error) {
        // If the plugin fails for any reason, don't block the app —
        // assume online rather than trapping the user on a blank/white
        // screen with no way out.
        console.log("NetworkStatus init error:", error);
        setIsOnline(true);
      } finally {
        setChecked(true);
=======
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
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3
      }
    };

    init();

    return () => {
      if (listenerHandle) listenerHandle.remove();
<<<<<<< HEAD
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
=======
      window.removeEventListener("online", () => setIsOnline(true));
      window.removeEventListener("offline", () => setIsOnline(false));
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3
    };
  }, []);

  const handleRetry = async () => {
<<<<<<< HEAD
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
      } else {
        setIsOnline(navigator.onLine);
      }
    } catch (error) {
      console.log("NetworkStatus retry error:", error);
=======
    if (Capacitor.isNativePlatform()) {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
    } else {
      setIsOnline(navigator.onLine);
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3
    }
  };

  // Avoid flashing "offline" before first check completes
  if (!checked) return <>{children}</>;

  if (!isOnline) {
    return (
<<<<<<< HEAD
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080808] px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.08] text-[#D4AF37]">
          <WifiOff size={28} strokeWidth={1.75} />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-white">
          No Internet Connection
        </h2>
        <p className="mt-1 text-sm text-white/40">
          Please check your connection and try again.
        </p>

        <button
          onClick={handleRetry}
          className="mt-6 min-h-[44px] rounded-xl bg-[#D4AF37] px-6 py-2.5 text-sm font-semibold text-black transition duration-150 active:scale-95"
=======
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
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
