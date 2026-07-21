"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, BellOff, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string | null; // e.g. "/sales/my-leads?leadId=123" or "/sales/announcements?announcementId=456"
}

// 👇 Component ab userId prop leta hai, taake Realtime subscription
// SIRF isi user ke INSERTs sunay, sab ke nahi.
interface Props {
  userId: string;
}

// Compact, human relative time — "2m", "3h", "5d" — reads calmer in a
// dense notification list than a full locale timestamp.
function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function NotificationBell({ userId }: Props) {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce ke liye — burst mein aane wale multiple events ko
  // ek hi fetch mein collapse karne ke liye
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    // Agar pehle se ek fetch chal rahi hai, dobara mat chalao —
    // isse overlapping requests ka backlog nahi banega
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch("/api/salesperson/notifications", {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        setNotifications(
          Array.isArray(data?.notifications) ? data.notifications : [],
        );
        setUnreadCount(
          typeof data?.unreadCount === "number" ? data.unreadCount : 0,
        );
      }
    } catch (error) {

    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Debounced version — 800ms ke andar aane wale sab events ko
  // combine karke sirf EK fetch chalata hai
  const debouncedFetch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void fetchNotifications();
    }, 800);
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/salesperson/notifications/${id}`, {
          method: "PATCH",
        });

        await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
    },
    [fetchNotifications],
  );

  // Clicking a notification: mark it read (if unread) and navigate to
  // whatever page it points to — lead, announcement, etc. The backend
  // decides the link, so this component doesn't need per-type logic.
  const handleNotificationClick = useCallback(
    (item: Notification) => {
      if (!item.isRead) {
        fetch(`/api/salesperson/notifications/${item.id}`, {
          method: "PATCH",
        })
          .then(() => fetchNotifications())
          .catch(() => {});
      }

      setOpen(false);

      if (item.link) {
        router.push(item.link);
      }
    },
    [fetchNotifications, router],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/salesperson/notifications", {
        method: "PATCH",
      });

      await fetchNotifications();

      setOpen(false);
    } catch (error) {

    }
  }, [fetchNotifications]);

  const deleteNotification = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/salesperson/notifications/${id}`, {
          method: "DELETE",
        });
        await fetchNotifications();
      } catch (e) { console.error("Failed to delete notification:", e); }
    },
    [fetchNotifications],
  );

  // Initial load
  useEffect(() => {
    // Avoid calling setState synchronously inside effect — schedule for microtask
    Promise.resolve().then(() => {
      void fetchNotifications();
    });
  }, [fetchNotifications]);

  // Realtime subscription — ab SIRF is user ki notifications sunta hai.
  // Channel topic ko "-bell" suffix diya gaya hai taake useSalesNotifications
  // hook ke channel se kabhi collide na ho (Supabase topic name se channel
  // instance reuse karta hai, isliye unique naming zaroori hai). "*" listen
  // karta hai taake DELETE/UPDATE (e.g. lead unassign) bhi refetch trigger kare.
  useEffect(() => {
    if (!userId) return;

    const channelName = `sales-notifications-bell-${userId}`;

    // Remove any existing channel with the same name
    supabase.getChannels().forEach((channel) => {
      if (channel.topic === `realtime:${channelName}`) {
        supabase.removeChannel(channel);
      }
    });

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Notification",
          filter: `userId=eq.${userId}`,
        },
        () => {
          debouncedFetch();
        },
      )
      .subscribe((status) => {

      });

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      supabase.removeChannel(channel);
    };
  }, [userId, debouncedFetch]);

  // Close dropdown when clicking or tapping anywhere outside it
  useEffect(() => {
    if (!open) return;

    function handleOutsideInteraction(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("touchstart", handleOutsideInteraction);

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("touchstart", handleOutsideInteraction);
    };
  }, [open]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      {/* scoped styles: thin gold-tinted scrollbar + badge glow pulse,
          respects prefers-reduced-motion */}
      <style>{`
        .notif-scroll::-webkit-scrollbar { width: 5px; }
        .notif-scroll::-webkit-scrollbar-track { background: transparent; }
        .notif-scroll::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.25);
          border-radius: 9999px;
        }
        .notif-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.4);
        }
        @keyframes notifBadgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.45); }
          50% { box-shadow: 0 0 0 5px rgba(212, 175, 55, 0); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .notif-badge-glow { animation: notifBadgePulse 2.2s ease-out infinite; }
        }
      `}</style>

      <button
        onClick={() =>
          setOpen((prev) => {
            const next = !prev;
            if (next) void fetchNotifications();
            return next;
          })
        }
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        className="
        group
        relative
        flex
        h-11
        w-11
        items-center
        justify-center
        rounded-xl
        border
        border-[#D4AF37]/15
        bg-gradient-to-b
        from-white/[0.04]
        to-transparent
        text-zinc-400
        outline-none
        transition-all
        duration-200
        hover:border-[#D4AF37]/40
        hover:text-[#D4AF37]
        focus-visible:border-[#D4AF37]/60
        focus-visible:ring-2
        focus-visible:ring-[#D4AF37]/25
        "
      >
        <Bell
          size={18}
          strokeWidth={1.75}
          className="transition-transform duration-200 group-hover:scale-105"
        />

        {unreadCount > 0 && (
          <span
            className="
            notif-badge-glow
            absolute
            -right-1
            -top-1
            flex
            h-[18px]
            min-w-[18px]
            items-center
            justify-center
            rounded-full
            border
            border-black/40
            bg-gradient-to-b
            from-[#F1D272]
            to-[#C89B2E]
            px-[5px]
            text-[10px]
            font-bold
            leading-none
            text-black
            "
          >
            {unreadCount > 9 ? "9+" : unreadCount}
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
          max-w-[360px]
          overflow-hidden
          rounded-3xl
          border
          border-[#D4AF37]/15
          bg-gradient-to-b
          from-[#151412]
          to-[#0a0a09]
          shadow-[0_25px_70px_-20px_rgba(0,0,0,0.8)]
          animate-in
          fade-in
          slide-in-from-top-2
          duration-200
          "
        >
          {/* signature: soft gold light-leak along the top edge */}
          <div
            aria-hidden
            className="
            pointer-events-none
            absolute
            inset-x-0
            top-0
            h-px
            bg-gradient-to-r
            from-transparent
            via-[#D4AF37]/70
            to-transparent
            "
          />
          <div
            aria-hidden
            className="
            pointer-events-none
            absolute
            -top-10
            left-1/2
            h-24
            w-[70%]
            -translate-x-1/2
            rounded-full
            bg-[#D4AF37]/[0.08]
            blur-3xl
            "
          />

          {/* Header */}
          <div
            className="
            relative
            flex
            items-center
            justify-between
            border-b
            border-white/[0.06]
            px-5
            py-4
            "
          >
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight text-[#F3EFE6]">
                Notifications
              </h3>
              <p className="mt-0.5 text-[11px] text-white/35">
                {unreadCount > 0
                  ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                  : "You're all caught up"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="
                flex
                items-center
                gap-1.5
                rounded-full
                border
                border-[#D4AF37]/25
                bg-[#D4AF37]/[0.06]
                px-3
                py-1.5
                text-[11px]
                font-medium
                text-[#D4AF37]
                transition
                duration-150
                hover:border-[#D4AF37]/50
                hover:bg-[#D4AF37]/10
                "
              >
                <Check size={12} strokeWidth={2.5} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="notif-scroll relative max-h-[440px] overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div
                  className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-white/[0.06]
                  bg-white/[0.02]
                  text-white/20
                  "
                >
                  <BellOff size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/60">
                    All caught up
                  </p>
                  <p className="mt-1 text-xs text-white/30">
                    New updates will show up here
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 p-2.5">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    role={item.link ? "button" : undefined}
                    tabIndex={item.link ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (item.link && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleNotificationClick(item);
                      }
                    }}
                    className={`
                    group
                    relative
                    rounded-2xl
                    border
                    border-transparent
                    px-3.5
                    py-3
                    transition-all
                    duration-150
                    ${item.link ? "cursor-pointer" : ""}
                    ${
                      !item.isRead
                        ? "bg-[#D4AF37]/[0.05] hover:border-[#D4AF37]/20 hover:bg-[#D4AF37]/[0.08]"
                        : "hover:bg-white/[0.03]"
                    }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* unread indicator dot */}
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          !item.isRead ? "bg-[#D4AF37]" : "bg-transparent"
                        }`}
                        aria-hidden
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-[13px] leading-snug ${
                              !item.isRead
                                ? "font-semibold text-[#F3EFE6]"
                                : "font-medium text-white/55"
                            }`}
                          >
                            {item.title}
                          </p>

                          <div className="flex items-center gap-1 shrink-0">
                            {!item.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(item.id);
                                }}
                                title="Mark as read"
                                className="
                                flex
                                h-6
                                w-6
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                border
                                border-[#D4AF37]/20
                                text-[#D4AF37]/70
                                opacity-100
                                sm:opacity-0
                                transition
                                duration-150
                                sm:group-hover:opacity-100
                                hover:border-[#D4AF37]
                                hover:bg-[#D4AF37]
                                hover:text-black
                                "
                              >
                                <Check size={11} strokeWidth={2.5} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(item.id);
                              }}
                              title="Delete"
                              className="
                              flex
                              h-6
                              w-6
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              border
                              border-red-500/20
                              text-red-400/60
                              opacity-100
                              sm:opacity-0
                              transition
                              duration-150
                              sm:group-hover:opacity-100
                              hover:border-red-400
                              hover:bg-red-500/20
                              hover:text-red-400
                              "
                            >
                              <Trash2 size={10} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>

                        <p className="mt-0.5 break-words text-[12px] leading-snug text-white/35">
                          {item.message}
                        </p>

                        <p className="mt-1.5 text-[10.5px] font-medium tracking-wide text-[#D4AF37]/60">
                          {timeAgo(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
