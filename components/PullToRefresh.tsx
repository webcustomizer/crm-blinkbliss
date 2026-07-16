// components/PullToRefresh.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";

const PULL_THRESHOLD = 80; // px needed to trigger refresh
const MAX_PULL = 120;

export default function PullToRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    // Only enable on native (skip on plain web/desktop if you want)
    // Remove this check if you want it on web too
    if (!Capacitor.isNativePlatform()) return;

    const onTouchStart = (e: TouchEvent) => {
<<<<<<< HEAD
      // Agar touch kisi modal/overlay/fixed panel ke andar shuru hua hai
      // (jaise LeadDetails jismein data-no-ptr laga hua hai), to
      // pull-to-refresh bilkul track hi na karein — us panel ka apna
      // internal scroll hai, window.scrollY yahan bharosemand nahi hota
      const target = e.target as HTMLElement;
      if (target.closest("[data-no-ptr]")) {
        pulling.current = false;
        return;
      }

=======
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3
      // Only start tracking if page is already scrolled to top
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && window.scrollY === 0) {
        // prevent the native page bounce/scroll while pulling
        e.preventDefault();
        setPullDistance(Math.min(diff * 0.5, MAX_PULL));
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;

      if (pullDistance >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        // trigger actual refresh
        window.location.reload();
        // If you'd rather refetch data instead of a full reload,
        // replace the line above with your own refetch logic and
        // then reset state:
        // await refetchData();
        // setRefreshing(false);
        // setPullDistance(0);
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, refreshing]);

  return (
    <>
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{
          height: pullDistance,
        }}
      >
        {pullDistance > 0 && (
          <div
            className={`h-6 w-6 rounded-full border-2 border-gray-400 border-t-transparent ${
              refreshing || pullDistance >= PULL_THRESHOLD ? "animate-spin" : ""
            }`}
            style={{
              transform: `rotate(${pullDistance * 3}deg)`,
            }}
          />
        )}
      </div>
      {children}
    </>
  );
}
