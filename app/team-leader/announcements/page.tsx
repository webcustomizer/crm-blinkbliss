"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/team-leader/announcements").then((r) => r.json()).then((j) => {
      if (j.success) {
        setAnnouncements(j.data);
        const unreadIds = j.data.filter((a: any) => !a.isRead).map((a: any) => a.id);
        if (unreadIds.length > 0) {
          fetch("/api/team-leader/announcements", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ announcementIds: unreadIds }),
          }).then(() => toast.success("Marked as read"));
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Announcements</h1>
      {announcements.length === 0 ? (
        <p className="text-zinc-500 text-sm">No announcements.</p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {announcements.map((a: any) => (
            <div key={a.id} className={`rounded-xl border p-4 ${a.isPinned ? "border-[#D4AF37]/40 bg-[#D4AF37]/5" : "border-[#D4AF37]/20 bg-[#171717]"}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">{a.title}</h3>
                {a.isPinned && <span className="text-[10px] text-[#D4AF37]">📌 Pinned</span>}
              </div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{a.message}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                <span>{a.createdBy?.name}</span>
                <span>{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}