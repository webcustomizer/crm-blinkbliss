"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Megaphone, Pin } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { formatDate, formatDateTime, formatTime, formatDateShort } from "@/lib/format-date";
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

  const readSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (announcements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleIds: string[] = [];
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-announcement-id");
            if (id && !readSetRef.current.has(id)) {
              readSetRef.current.add(id);
              visibleIds.push(id);
            }
          }
        });
        if (visibleIds.length > 0) markAsRead(visibleIds);
      },
      { threshold: 0.6 },
    );

    const timer = setTimeout(() => {
      document.querySelectorAll("[data-announcement-id]").forEach((el) => observer.observe(el));
    }, 300);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
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
top-3
z-20
cursor-pointer
rounded-2xl
border
border-[#D4AF37]/40
bg-[#18140A]/95
backdrop-blur-md
p-3
shadow-xl
transition
active:scale-[0.98]
"
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#D4AF37]/20
                    text-[#D4AF37]
                    "
                >
                  <Pin size={17} />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="
                      text-xs
                      font-semibold
                      text-[#D4AF37]
                      "
                  >
                    📌 Pinned Announcement
                  </p>

                  <p
                    className="
                      truncate
                      text-sm
                      text-white
                      "
                  >
                    {pinnedAnnouncement.title}
                  </p>
                </div>

                <span className="text-xs text-gray-500">Tap</span>
              </div>
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
                rounded-3xl
                p-5
                shadow-lg
                transition

                ${
                  announcement.isPinned
                    ? "border border-[#D4AF37]/40 bg-[#18140A]"
                    : "border border-white/10 bg-[#111111] hover:border-[#D4AF37]/20"
                }

                `}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1">
                <div
                  className={`
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl

                    ${
                      announcement.isPinned
                        ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                        : "bg-[#D4AF37]/10 text-[#D4AF37]"
                    }

                    `}
                >
                  {announcement.isPinned ? (
                    <Pin size={22} />
                  ) : (
                    <Megaphone size={22} />
                  )}
                </div>
                {!announcement.isRead && (
                  <span className="mx-auto h-2 w-2 rounded-full bg-blue-500" />
                )}
                </div>

                <div className="flex-1">
                  <h3
                    className="
                      text-base
                      font-semibold
                      text-white
                      "
                  >
                    {announcement.title}
                  </h3>

                  <p
                    className="
                      mt-3
                      whitespace-pre-wrap
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
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
