"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Monitor, Smartphone, Tablet, X, Shield, Clock, Users, User } from "lucide-react";
import { formatDate, formatDateTime, formatTime, formatDateShort } from "@/lib/format-date";

type SessionData = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string | null;
  isCurrent: boolean;
};

export default function SessionsPanel() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewAll, setViewAll] = useState(false);

  async function fetchSessions(all: boolean) {
    try {
      setLoading(true);
      const url = all ? "/api/admin/sessions?all=true" : "/api/admin/sessions";
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success) setSessions(json.data);
    } catch {
      toast.error("Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSessions(viewAll); }, [viewAll]);

  async function terminateSession(sessionId: string) {
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: [sessionId] }),
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Session terminated.");
        fetchSessions(viewAll);
      } else toast.error(json.message);
    } catch {
      toast.error("Failed to terminate session.");
    }
  }

  async function terminateAllOthers() {
    const others = sessions.filter((s) => !s.isCurrent).map((s) => s.id);
    if (others.length === 0) {
      toast.info("No other sessions to terminate.");
      return;
    }
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: others }),
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Terminated ${others.length} session(s).`);
        fetchSessions(viewAll);
      } else toast.error(json.message);
    } catch {
      toast.error("Failed to terminate sessions.");
    }
  }

  function getDeviceIcon(type: string | null) {
    switch (type) {
      case "mobile": return <Smartphone size={18} />;
      case "tablet": return <Tablet size={18} />;
      default: return <Monitor size={18} />;
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
      </div>
    );
  }

  const groupedByUser: Record<string, SessionData[]> = {};
  if (viewAll) {
    sessions.forEach((s) => {
      const key = s.userId;
      if (!groupedByUser[key]) groupedByUser[key] = [];
      groupedByUser[key].push(s);
    });
  }

  return (
    <div className="rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-[#D4AF37]" />
          <h2 className="text-lg font-semibold text-white">Active Devices</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewAll(!viewAll)}
            className={`rounded-xl border px-3 py-2 text-sm transition-colors flex items-center gap-1.5 ${
              viewAll
                ? "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]"
                : "border-white/10 bg-black/25 text-white/60 hover:text-white"
            }`}
          >
            {viewAll ? <Users size={14} /> : <User size={14} />}
            {viewAll ? "All Users" : "My Sessions"}
          </button>
          <button
            onClick={terminateAllOthers}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Logout All Others
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {sessions.length === 0 ? (
          <p className="text-center text-white/40 py-10">No active sessions found.</p>
        ) : viewAll ? (
          <div className="space-y-6">
            {Object.entries(groupedByUser).map(([userId, userSessions]) => {
              const first = userSessions[0];
              return (
                <div key={userId} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-7 w-7 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-xs font-bold">
                      {first.userName?.[0] || "?"}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white">{first.userName}</span>
                      <span className="text-[10px] text-white/40 ml-2">{first.userEmail}</span>
                    </div>
                    <span className={`text-[10px] rounded-full px-2 py-0.5 font-bold ml-auto ${
                      first.userRole === "ADMIN"
                        ? "bg-red-400/10 text-red-400 border border-red-400/20"
                        : "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                    }`}>
                      {first.userRole}
                    </span>
                  </div>
                  {userSessions.map((session) => (
                    <SessionCard key={session.id} session={session} getDeviceIcon={getDeviceIcon} onTerminate={terminateSession} />
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} getDeviceIcon={getDeviceIcon} onTerminate={terminateSession} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  getDeviceIcon,
  onTerminate,
}: {
  session: SessionData;
  getDeviceIcon: (type: string | null) => React.ReactNode;
  onTerminate: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border p-4 transition-colors ${
        session.isCurrent
          ? "border-[#D4AF37]/30 bg-[#D4AF37]/[0.06]"
          : "border-white/10 bg-black/25 hover:border-[#D4AF37]/25"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
          session.isCurrent ? "border-[#D4AF37]/30 bg-[#D4AF37]/[0.12] text-[#D4AF37]" : "border-white/15 bg-black/30 text-white/50"
        }`}>
          {getDeviceIcon(session.deviceType)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-white">{session.deviceName || "Unknown Device"}</p>
            {session.isCurrent && (
              <span className="rounded-full bg-[#D4AF37]/20 px-2 py-0.5 text-[10px] font-medium text-[#D4AF37] uppercase tracking-wider">Current</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-white/40">{session.browser || "—"} · {session.os || "—"}</span>
            <span className="text-xs text-white/30">{session.ipAddress}</span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-white/30">
            <Clock size={10} />
            <span>Last active: {formatDateTime(session.lastActiveAt)}</span>
          </div>
        </div>
      </div>
      {!session.isCurrent && (
        <button onClick={() => onTerminate(session.id)} className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition-colors" title="Force logout">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
