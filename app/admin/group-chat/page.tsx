"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import GroupChatPanel from "@/components/admin/groupchat/GroupChatPanel";

export default function GroupChatPanelWrapper() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.user?.id) setCurrentUserId(j.user.id);
      })
      .catch(() => {});
  }, []);

  // We drop an invisible anchor in the normal document flow. Its position
  // tells us exactly where the content area starts on screen — below the
  // Topbar, to the right of the Sidebar, inside main's padding — without
  // having to guess or depend on every ancestor having correct flex/height
  // CSS. We then pin the real chat panel to those exact pixel coordinates
  // using position: fixed. Fixed elements are removed from the page's
  // normal flow entirely, so — exactly like the Sidebar — nothing can ever
  // make the page scroll to "reach" it. Only the panel's own internal
  // messages list (overflow-y-auto) will ever scroll.
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
    // shift the Topbar/Sidebar height a few px after first paint.
    const t = setTimeout(measure, 200);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      clearTimeout(t);
    };
  }, [currentUserId]);

  if (!currentUserId) {
    return <div className="text-gray-400">Loading…</div>;
  }

  return (
    <>
      <div ref={anchorRef} />
      {rect ? (
        <div
          className="bottom-20 sm:bottom-6"
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
          }}
        >
          <GroupChatPanel currentUserId={currentUserId} />
        </div>
      ) : (
        // First paint, before we've measured the anchor — avoids a flash
        // of an unsized/collapsed panel.
        <div className="h-[70vh]">
          <GroupChatPanel currentUserId={currentUserId} />
        </div>
      )}
    </>
  );
}
