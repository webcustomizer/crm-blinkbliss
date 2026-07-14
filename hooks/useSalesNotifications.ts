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

    let channel: ReturnType<typeof supabase.channel> | null = null;
    const idle = setTimeout(() => {
      channel = supabase
        .channel(`sales-notifications-${userId}`)
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
    }, 1500);

    return () => {
      clearTimeout(idle);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, onNewNotification]);
}
