"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type UnreadCounts = { messages: number; groupChat: number; announcements: number };
type UnreadContextType = UnreadCounts & { refetch: () => void };

const UnreadContext = createContext<UnreadContextType>({
  messages: 0,
  groupChat: 0,
  announcements: 0,
  refetch: () => {},
});

export function UnreadProvider({ children, userId }: { children: ReactNode; userId?: string }) {
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

    // Without a userId we can't scope the filters below (e.g. server-rendered
    // shell before the user is known) — fall back to the unfiltered channel
    // rather than silently subscribing to nothing.
    if (!userId) {
      const fallbackChannel = supabase
        .channel("unread-count-realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "Notification" }, () => debouncedFetch())
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "Announcement" }, () => debouncedFetch())
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message" }, () => debouncedFetch())
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "GroupMessage" }, () => debouncedFetch())
        .subscribe();

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        supabase.removeChannel(fallbackChannel);
      };
    }

    // Scoped channel — each filter only fires for rows relevant to this
    // user, instead of every salesperson refetching on every insert
    // anywhere in these tables.
    const channel = supabase
      .channel(`unread-count-realtime-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Notification", filter: `userId=eq.${userId}` },
        () => { debouncedFetch(); },
      )
      .on(
        // Announcements are global (no per-user targeting in the schema),
        // so every insert is genuinely relevant — no filter to apply here.
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Announcement" },
        () => { debouncedFetch(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Message", filter: `receiverId=eq.${userId}` },
        () => { debouncedFetch(); },
      )
      .on(
        // Group chat is shared by everyone, but we only need to refetch when
        // someone ELSE posts — our own sends don't add to our unread count.
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "GroupMessage", filter: `senderId=neq.${userId}` },
        () => { debouncedFetch(); },
      )
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchUnread, debouncedFetch, userId]);

  return (
    <UnreadContext.Provider value={{ ...unread, refetch: fetchUnread }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnreadCounts() {
  return useContext(UnreadContext);
}