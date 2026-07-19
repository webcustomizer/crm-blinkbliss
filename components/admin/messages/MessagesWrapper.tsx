"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import MessagesPanel from "@/components/admin/messages/MessagesPanel";

export default function AdminMessagesWrapper() {
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
          <MessagesPanel />
        </div>
      ) : (
        <div className="h-[70vh]">
          <MessagesPanel />
        </div>
      )}
    </>
  );
}
