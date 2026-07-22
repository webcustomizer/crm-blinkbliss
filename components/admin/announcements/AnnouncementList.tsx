"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Pin, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format-date";

type Announcement = {
  id: string;

  title: string;

  message: string;

  createdAt: string;

  isPinned: boolean;

  createdBy: {
    id: string;
    name: string;
  };
};

export default function AnnouncementList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [loading, setLoading] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function deleteAnnouncement(id: string) {
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error();
      }

      toast.success("Announcement deleted");

      getAnnouncements();
    } catch {
      toast.error("Failed to delete announcement");
    }
  }

  async function getAnnouncements() {
    try {
      const res = await fetch("/api/admin/announcements", {
        cache: "no-store",
      });

      const result = await res.json();

      setAnnouncements(result.data || []);
    } catch {
      toast.error("Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getAnnouncements();
  }, []);

  // realtime

  useEffect(() => {
    const channel = supabase
      .channel("announcement-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Announcement",
        },
        () => {
          getAnnouncements();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function togglePin(id: string, isPinned: boolean) {
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          isPinned: !isPinned,
        }),
      });

      if (!res.ok) {
        throw new Error();
      }

      toast.success(
        !isPinned ? "Announcement pinned" : "Announcement unpinned",
      );

      getAnnouncements();
    } catch {
      toast.error("Failed to update announcement");
    }
  }

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
    <div
      className="
      rounded-2xl
      border
      border-[#D4AF37]/20
      bg-[#111111]
      p-6
      shadow-xl
      "
    >
      <h2
        className="
        mb-6
        text-xl
        font-bold
        text-[#D4AF37]
        "
      >
        Recent Announcements
      </h2>

      {announcements.length === 0 ? (
        <div
          className="
            rounded-xl
            border
            border-dashed
            border-white/10
            py-12
            text-center
            text-gray-400
            "
        >
          No announcements found.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="
                rounded-xl
                border
                border-[#D4AF37]/10
                bg-black/20
                p-5
                transition
                hover:border-[#D4AF37]/30
                "
            >
              <div
                className="
                  flex
                  items-start
                  gap-4
                  "
              >
                <div
                  className="
                    rounded-xl
                    bg-[#D4AF37]/10
                    p-3
                    text-[#D4AF37]
                    "
                >
                  <Megaphone size={20} />
                </div>

                <div className="flex-1">
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-4
                      "
                  >
                    <div className="flex items-center gap-3">
                      <h3
                        className="
                          text-lg
                          font-semibold
                          text-white
                          "
                      >
                        {announcement.title}
                      </h3>

                      {announcement.isPinned && (
                        <span
                          className="
                              rounded-full
                              bg-[#D4AF37]/20
                              px-2
                              py-1
                              text-xs
                              text-[#D4AF37]
                              "
                        >
                          Pinned
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          togglePin(announcement.id, announcement.isPinned)
                        }
                        className="
                          rounded-lg
                          border
                          border-[#D4AF37]/30
                          p-2
                          text-[#D4AF37]
                          hover:bg-[#D4AF37]/10
                          "
                      >
                        <Pin size={16} />
                      </button>

                      <button
                        onClick={() => setDeleteId(announcement.id)}
                        className="
                          rounded-lg
                          border
                          border-red-500/30
                          p-2
                          text-red-400
                          hover:bg-red-500/10
                          "
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <span
                    className="
                      text-xs
                      text-gray-500
                      "
                  >
                    {formatDateTime(announcement.createdAt)}
                  </span>

                  <p
                    className="
                      mt-3
                      whitespace-pre-wrap
                      text-gray-300
                      "
                  >
                    {announcement.message}
                  </p>

                  <div
                    className="
                      mt-4
                      text-xs
                      text-[#D4AF37]
                      "
                  >
                    Published by {announcement.createdBy.name}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {deleteId && (
        <div
          className="
    fixed
    inset-0
    z-50
    flex
    items-center
    justify-center
    bg-black/70
    backdrop-blur-sm
    "
        >
          <div
            className="
      w-100
      rounded-2xl
      border
      border-[#D4AF37]/20
      bg-[#111111]
      p-6
      shadow-2xl
      "
          >
            <h3
              className="
        text-lg
        font-semibold
        text-white
        "
            >
              Delete Announcement?
            </h3>

            <p
              className="
        mt-3
        text-sm
        text-gray-400
        "
            >
              Are you sure you want to delete this announcement? This action
              cannot be undone.
            </p>

            <div
              className="
        mt-6
        flex
        justify-end
        gap-3
        "
            >
              <button
                onClick={() => setDeleteId(null)}
                className="
          rounded-xl
          border
          border-white/10
          px-4
          py-2
          text-sm
          text-gray-300
          hover:bg-white/5
          "
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  deleteAnnouncement(deleteId);
                  setDeleteId(null);
                }}
                className="
          rounded-xl
          border
          border-red-500/30
          bg-red-500/10
          px-4
          py-2
          text-sm
          text-red-400
          hover:bg-red-500/20
          "
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
