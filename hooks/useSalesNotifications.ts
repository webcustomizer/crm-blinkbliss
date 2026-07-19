"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface UseSalesNotificationsProps {
  userId?: string;
  onNewNotification?: () => void;
  debounceMs?: number;
}

export default function useSalesNotifications({
  userId,
  onNewNotification,
  debounceMs = 2000,
}: UseSalesNotificationsProps) {
  const cbRef = useRef(onNewNotification);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callback ref fresh without resetting the effect
  useEffect(() => {
    cbRef.current = onNewNotification;
  }, [onNewNotification]);

  useEffect(() => {
    if (!userId) return;

    const channelName = `sales-notifications-hook-${userId}`;

    supabase.getChannels().forEach((ch) => {
      if (ch.topic === `realtime:${channelName}`) {
        supabase.removeChannel(ch);
      }
    });

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
          filter: `userId=eq.${userId}`,
        },
        () => {
          // Debounce: collapse bursts of notifications into ONE callback
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            cbRef.current?.();
          }, debounceMs);
        },
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [userId, debounceMs]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
}
