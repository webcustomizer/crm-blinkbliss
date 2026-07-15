"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface UseSalesNotificationsProps {
  userId?: string;
  onNewNotification?: () => void;
}

export default function useSalesNotifications({
  userId,
  onNewNotification,
}: UseSalesNotificationsProps) {
  useEffect(() => {
    if (!userId) return;

    // Unique topic so this never collides with NotificationBell's own channel
    // for the same user (Supabase reuses channel instances by topic name).
    const channelName = `sales-notifications-hook-${userId}`;

    // Clean up any stale channel with the same topic (e.g. from React
    // Strict Mode double-invoking this effect in development).
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
        (payload) => {
          console.log("NEW SALES NOTIFICATION:", payload);
          onNewNotification?.();
        },
      )
      .subscribe((status) => {
        console.log("Notification channel:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onNewNotification]);
}
