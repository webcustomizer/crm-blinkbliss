"use client";

import { useLayoutEffect, useRef, useState } from "react";
import SalesMessagesPanel from "@/components/sales/messages/SalesMessagesPanel";

export default function SalesMessagesWrapper({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    function measure() {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    const t = setTimeout(measure, 200);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      clearTimeout(t);
    };
  }, []);

  return (
    <>
      <div ref={anchorRef} />
      {rect ? (
        <div
          className="bottom-16 lg:bottom-6"
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
          }}
        >
          <SalesMessagesPanel currentUserId={currentUserId} />
        </div>
      ) : (
        <div className="h-[70vh]">
          <SalesMessagesPanel currentUserId={currentUserId} />
        </div>
      )}
    </>
  );
}
