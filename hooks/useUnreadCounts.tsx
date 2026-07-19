"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";

type UnreadCounts = { messages: number; groupChat: number; announcements: number };

const UnreadContext = createContext<UnreadCounts>({ messages: 0, groupChat: 0, announcements: 0 });

export function UnreadProvider({ children }: { children: ReactNode }) {
  const [unread, setUnread] = useState<UnreadCounts>({ messages: 0, groupChat: 0, announcements: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const r = await fetch("/api/salesperson/unread-count", { cache: "no-store" });
      const j = await r.json();
      if (j.success) setUnread(j.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchUnread]);

  return <UnreadContext.Provider value={unread}>{children}</UnreadContext.Provider>;
}

export function useUnreadCounts() {
  return useContext(UnreadContext);
}
