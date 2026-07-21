"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type UnreadCounts = { messages: number; groupChat: number; announcements: number };

const UnreadContext = createContext<UnreadCounts>({ messages: 0, groupChat: 0, announcements: 0 });

export function UnreadProvider({ children }: { children: ReactNode }) {
  const [unread, setUnread] = useState<UnreadCounts>({ messages: 0, groupChat: 0, announcements: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const r = await fetch("/api/salesperson/unread-count", { cache: "no-store" });
      const j = await r.json();
      if (j.success) setUnread(j.data);
    } catch {}
  }, []);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchUnread, 500);
  }, [fetchUnread]);

  useEffect(() => {
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, 15000);

    const channel = supabase
      .channel("unread-count-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Notification" },
        () => { debouncedFetch(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Announcement" },
        () => { debouncedFetch(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Message" },
        () => { debouncedFetch(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "GroupMessage" },
        () => { debouncedFetch(); },
      )
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchUnread, debouncedFetch]);

  return <UnreadContext.Provider value={unread}>{children}</UnreadContext.Provider>;
}

export function useUnreadCounts() {
  return useContext(UnreadContext);
}
