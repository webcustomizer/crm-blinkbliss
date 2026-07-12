"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";

import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/salesperson/notifications", {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
        setUnreadCount(typeof data?.unreadCount === "number" ? data.unreadCount : 0);
      }
    } catch (error) {
      console.log("Notification fetch error", error);
    }
  }, []);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/salesperson/notifications/${id}`, {
          method: "PATCH",
        });

        await fetchNotifications();
      } catch (error) {
        console.log("Mark read error", error);
      }
    },
    [fetchNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/salesperson/notifications", {
        method: "PATCH",
      });

      await fetchNotifications();

      // dropdown close
      setOpen(false);
    } catch (error) {
      console.log("Mark all read error", error);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const res = await fetch("/api/salesperson/notifications", {
          cache: "no-store",
        });

        const data = await res.json();

        if (!isMounted) return;

        if (res.ok) {
          setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
          setUnreadCount(typeof data?.unreadCount === "number" ? data.unreadCount : 0);
        }
      } catch (error) {
        if (!isMounted) return;
        console.log("Notification fetch error", error);
      }
    };

    void loadNotifications();

    const channel = supabase
      .channel("sales-notifications-ui")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
        },

        (payload) => {
          console.log("Realtime notification:", payload);

          void loadNotifications();
        },
      )

      .subscribe((status) => {
        console.log("Notification UI:", status);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="
        relative
        flex
        h-11
        w-11
        items-center
        justify-center
        rounded-xl
        border
        border-[#D4AF37]/20
        text-zinc-300
        transition
        hover:border-[#D4AF37]
        hover:text-[#D4AF37]
        "
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span
            className="
          absolute
          -right-1
          -top-1
          flex
          h-5
          min-w-5
          items-center
          justify-center
          rounded-full
          bg-[#D4AF37]
          px-1
          text-[11px]
          font-bold
          text-black
          "
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="
  fixed
  right-3
  top-16
  z-[999]
  w-[calc(100vw-24px)]
  max-w-[340px]
  overflow-hidden
  rounded-2xl
  border
  border-[#D4AF37]/20
  bg-[#161616]
  shadow-xl
  "
        >
          <div
            className="
  flex
  items-center
  justify-between
  border-b
  border-[#D4AF37]/20
  px-4
  py-3
  "
          >
            <h3 className="font-semibold text-white">Notifications</h3>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="
      text-xs
      text-[#D4AF37]
      transition
      hover:text-white
      "
              >
                Mark all as read
              </button>
            )}
          </div>

          <div
            className="
          max-h-[420px]
          overflow-y-auto
          "
          >
            {notifications.length === 0 ? (
              <p
                className="
            p-5
            text-center
            text-sm
            text-zinc-400
            "
              >
                No notifications
              </p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`
              border-b
              border-[#D4AF37]/10
              p-4
              transition
              hover:bg-[#D4AF37]/5
              ${!item.isRead ? "bg-[#D4AF37]/5" : ""}
              `}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.title}
                      </p>

                      <p className="mt-1 break-words text-xs text-zinc-400">
                        {item.message}
                      </p>
                    </div>

                    {!item.isRead && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-[#D4AF37]/20
                    text-[#D4AF37]
                    hover:bg-[#D4AF37]
                    hover:text-black
                    "
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>

                  <p
                    className="
                mt-2
                text-[11px]
                text-[#D4AF37]
                "
                  >
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
