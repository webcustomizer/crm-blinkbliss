// components/NetworkStatus.tsx
"use client";

import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import { Capacitor } from "@capacitor/core";
import { WifiOff } from "lucide-react";

export default function NetworkStatus({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
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

        setIsOnline(true);
      } finally {
        setChecked(true);
      }
    };

    init();

    return () => {
      if (listenerHandle) listenerHandle.remove();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
      } else {
        setIsOnline(navigator.onLine);
      }
    } catch (error) {

    }
  };

  // Avoid flashing "offline" before first check completes
  if (!checked) return <>{children}</>;

  if (!isOnline) {
    return (
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
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
