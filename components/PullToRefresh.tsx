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
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-no-ptr]")) {
        pulling.current = false;
        return;
      }

      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && window.scrollY === 0) {
        e.preventDefault();
        const next = Math.min(diff * 0.5, MAX_PULL);
        pullDistanceRef.current = next;
        setPullDistance(next);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;

      if (pullDistanceRef.current >= PULL_THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        window.location.reload();
      } else {
        pullDistanceRef.current = 0;
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
  }, []);

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
