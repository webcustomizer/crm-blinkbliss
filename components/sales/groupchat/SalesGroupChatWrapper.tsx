"use client";

import { useLayoutEffect, useRef, useState } from "react";
import SalesGroupChatPanel from "@/components/sales/groupchat/SalesGroupChatPanel";

export default function SalesGroupChatWrapper({
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

  // Same technique as the admin GroupChatPanelWrapper: drop an invisible
  // anchor in the normal document flow (inside the shared layout's padded
  // content area). Its position tells us exactly where the content area
  // starts — below the sticky Header, to the right of the Sidebar, inside
  // main's padding — without touching or branching the shared SalesShell
  // layout itself (which is what caused the hydration mismatch before).
  // We then pin the real chat panel to those exact pixel coordinates using
  // position: fixed. This measurement runs client-side only, after mount,
  // so there is nothing for the server-rendered HTML to disagree with.
  useLayoutEffect(() => {
    function measure() {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    // Re-measure shortly after mount too — fonts/images loading in can
    // shift the Header height a few px after first paint.
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
          // bottom-16 = exact height of MobileBottomNav (h-16), so the panel's
          // bottom edge lands right above it on mobile. The bottom nav is
          // hidden from lg upward (lg:hidden), so we only need a small
          // breathing-room margin on desktop.
          className="bottom-16 lg:bottom-6"
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
          }}
        >
          <SalesGroupChatPanel currentUserId={currentUserId} />
        </div>
      ) : (
        // First paint, before we've measured the anchor — avoids a flash
        // of an unsized/collapsed panel.
        <div className="h-[70vh]">
          <SalesGroupChatPanel currentUserId={currentUserId} />
        </div>
      )}
    </>
  );
}
