// components/AnimatedLaunchScreen.tsx
"use client";

import { useEffect, useState } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { Capacitor } from "@capacitor/core";
import Image from "next/image";

export default function AnimatedLaunchScreen({
  children,
}: {
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<"showing" | "exiting" | "done">("showing");

  useEffect(() => {
    // Hide the native splash the instant our web splash is painted,
    // so there's no gap/flash between native and web splash
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide();
    }

    const exitTimer = setTimeout(() => setPhase("exiting"), 1100);
    const doneTimer = setTimeout(() => setPhase("done"), 1500);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black transition-opacity duration-400 ease-out ${
          phase === "exiting" ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="animate-splash-logo">
          <Image
            src="/icon-fitted.png"
            alt="Blink & Bliss"
            width={180}
            height={180}
            priority
          />
        </div>
      </div>
      {/* Render app underneath so it's ready the instant splash fades */}
      <div className={phase === "exiting" ? "block" : "hidden"}>{children}</div>
    </>
  );
}
