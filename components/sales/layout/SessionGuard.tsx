"use client";

import { useEffect, useRef } from "react";

import { supabase } from "@/lib/supabase";

interface SessionGuardProps {
  userId: string;
}

export default function SessionGuard({ userId }: SessionGuardProps) {
  const hasLoggedOutRef = useRef(false);

  useEffect(() => {
    async function forceLogout(reason: string) {
      if (hasLoggedOutRef.current) return;
      hasLoggedOutRef.current = true;

      window.location.href = "/api/force-logout";
    }

    const channel = supabase
      .channel(`session-guard-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "User",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as { isActive?: boolean };

          if (updated?.isActive === false) {
            void forceLogout("Account deactivated");
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "User",
          filter: `id=eq.${userId}`,
        },
        () => {
          void forceLogout("Account deleted");
        },
      )
      .subscribe((status) => {

      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
