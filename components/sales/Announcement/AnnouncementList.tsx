"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Megaphone, Pin, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format-date";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";

type Announcement = {
  id: string;
  title: string;
  message: string;
  isPinned: boolean;
  isRead: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
};

export default function AnnouncementList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const pinnedRef = useRef<HTMLDivElement | null>(null);
  const { refetch } = useUnreadCounts();

  async function loadAnnouncements() {
    try {
      const res = await fetch("/api/salesperson/announcements", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch announcements: ${res.status}`);
      }

      const result = await res.json();

      setAnnouncements(result.data || []);
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    const channel = supabase

      .channel("salesperson-announcements")

      .on(
        "postgres_changes",

        {
          event: "*",
          schema: "public",
          table: "Announcement",
        },

        () => {
          loadAnnouncements();
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sortedAnnouncements = [...announcements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const pinnedAnnouncement = sortedAnnouncements.find((item) => item.isPinned);

  async function markAsRead(ids: string[]) {
    const unread = ids.filter((id) => {
      const a = announcements.find((x) => x.id === id);
      return a && !a.isRead;
    });
    if (unread.length === 0) return;
    setAnnouncements((prev) => prev.map((a) => (unread.includes(a.id) ? { ...a, isRead: true } : a)));
    try {
      await fetch("/api/salesperson/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementIds: unread }),
        cache: "no-store",
      });
      refetch();
    } catch {
      // silently fail
    }
  }

  // Opening this page counts as having seen everything currently loaded —
  // same pattern as Group Chat / Messages ("mark all on page open"), instead
  // of relying on scroll-into-view detection which needs a card to reach
  // 60% visibility to count. That threshold can never be met on a small
  // screen (e.g. the mobile app) when an announcement's text is taller than
  // the viewport, so long announcements were never marked read.
  useEffect(() => {
    if (announcements.length === 0) return;
    const unreadIds = announcements.filter((a) => !a.isRead).map((a) => a.id);
    if (unreadIds.length > 0) markAsRead(unreadIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements.length]);

  if (loading) {
    return (
      <div
        className="
        rounded-2xl
        border
        border-[#D4AF37]/20
        bg-[#111111]
        p-8
        text-center
        text-gray-400
        "
      >
        Loading announcements...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedAnnouncements.length === 0 ? (
        <div
          className="
            rounded-2xl
            border-dashed
            border
            border-white/10
            bg-[#111111]
            p-10
            text-center
            text-gray-400
            "
        >
          No announcements available.
        </div>
      ) : (
        <>
          {/* FIXED PINNED BAR */}

          {pinnedAnnouncement && (
            <div
              onClick={() => {
                pinnedRef.current?.scrollIntoView({
                  behavior: "smooth",

                  block: "start",
                });
              }}
              className="
sticky
top-0
z-20
flex
cursor-pointer
items-center
gap-2
border-l-4
border-[#D4AF37]
bg-[#18140A]/95
py-2.5
pl-3
pr-2
backdrop-blur-md
transition
active:scale-[0.98]
"
            >
              <Pin size={14} className="shrink-0 text-[#D4AF37]" />

              <p className="min-w-0 flex-1 truncate text-sm text-white">
                <span className="font-semibold text-[#D4AF37]">Pinned · </span>
                {pinnedAnnouncement.title}
              </p>

              <ChevronDown size={16} className="shrink-0 text-gray-500" />
            </div>
          )}

          {/* ALL ANNOUNCEMENTS */}

          {sortedAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              data-announcement-id={announcement.id}
              ref={(el) => {
                if (announcement.isPinned) {
                  pinnedRef.current = el;
                }
              }}
              className={`
                rounded-2xl
                p-4
                shadow-lg
                transition
                sm:rounded-3xl
                sm:p-5

                ${
                  announcement.isPinned
                    ? "border border-[#D4AF37]/40 bg-[#18140A]"
                    : "border border-white/10 bg-[#111111] hover:border-[#D4AF37]/20"
                }

                `}
            >
              {/* TITLE ROW — icon sits only next to the title, not the
                  whole card height, so the message/footer below can use
                  the card's full width instead of staying indented. */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg

                    ${
                      announcement.isPinned
                        ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                        : "bg-[#D4AF37]/10 text-[#D4AF37]"
                    }

                    `}
                >
                  {announcement.isPinned ? (
                    <Pin size={16} />
                  ) : (
                    <Megaphone size={16} />
                  )}
                </div>

                <h3
                  className="
                    min-w-0
                    flex-1
                    break-words
                    text-base
                    font-semibold
                    text-white
                    "
                >
                  {announcement.title}
                </h3>

                {!announcement.isRead && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
              </div>

              {/* MESSAGE + FOOTER — full card width, no icon-column indent */}
              <p
                className="
                  mt-3
                  whitespace-pre-wrap
                  break-words
                  text-sm
                  leading-relaxed
                  text-gray-300
                  "
              >
                {announcement.message}
              </p>

              <div
                className="
                  mt-4
                  flex
                  justify-between
                  text-xs
                  text-gray-500
                  "
              >
                <span>By {announcement.createdBy.name}</span>

                <span>
                  {formatDate(announcement.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}