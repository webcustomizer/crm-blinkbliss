"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Clock, ArrowRight, CheckCircle, Edit3, MessageSquareText,
  Star, Activity, Plus, UserPlus, Loader2, Filter,
  CircleDot, Zap,
} from "lucide-react";
import { formatDateTime } from "@/lib/format-date";

type TimelineEvent = {
  id: string;
  type: "CREATED" | "STATUS_CHANGED" | "FOLLOW_UP" | "ASSIGNED" | "EDITED" | "REMARK" | "PRIORITY" | "ACTIVITY";
  timestamp: string;
  description: string;
  meta?: Record<string, any>;
  user?: { id: string; name: string } | null;
};

const TYPE_META: Record<string, {
  icon: React.ReactNode; label: string;
  color: string; bg: string; border: string; glow: string; accent: string;
}> = {
  CREATED:        { icon: <Plus size={14} />,          label: "Created",     color: "text-emerald-400",  bg: "bg-emerald-500/10",  border: "border-emerald-500/20", glow: "shadow-emerald-500/10",    accent: "border-l-emerald-400" },
  STATUS_CHANGED: { icon: <ArrowRight size={14} />,    label: "Status",      color: "text-[#D4AF37]",    bg: "bg-[#D4AF37]/10",    border: "border-[#D4AF37]/20",   glow: "shadow-[#D4AF37]/10",      accent: "border-l-[#D4AF37]" },
  FOLLOW_UP:      { icon: <CheckCircle size={14} />,   label: "Follow Up",   color: "text-blue-400",     bg: "bg-blue-500/10",     border: "border-blue-500/20",    glow: "shadow-blue-500/10",       accent: "border-l-blue-400" },
  ASSIGNED:       { icon: <UserPlus size={14} />,      label: "Assigned",    color: "text-purple-400",   bg: "bg-purple-500/10",   border: "border-purple-500/20",  glow: "shadow-purple-500/10",     accent: "border-l-purple-400" },
  EDITED:         { icon: <Edit3 size={14} />,         label: "Edited",      color: "text-orange-400",   bg: "bg-orange-500/10",   border: "border-orange-500/20",  glow: "shadow-orange-500/10",     accent: "border-l-orange-400" },
  REMARK:         { icon: <MessageSquareText size={14} />, label: "Remark",  color: "text-cyan-400",     bg: "bg-cyan-500/10",     border: "border-cyan-500/20",    glow: "shadow-cyan-500/10",       accent: "border-l-cyan-400" },
  PRIORITY:       { icon: <Star size={14} />,          label: "Priority",    color: "text-yellow-400",   bg: "bg-yellow-500/10",   border: "border-yellow-500/20",  glow: "shadow-yellow-500/10",     accent: "border-l-yellow-400" },
  ACTIVITY:       { icon: <Activity size={14} />,      label: "Activity",    color: "text-zinc-400",     bg: "bg-zinc-500/10",     border: "border-zinc-500/20",    glow: "shadow-zinc-500/10",       accent: "border-l-zinc-400" },
};

const STATUS_BADGE: Record<string, { color: string; bg: string; border: string }> = {
  NEW:                  { color: "text-blue-400",     bg: "bg-blue-500/10",     border: "border-blue-500/20" },
  CALLED:               { color: "text-yellow-400",   bg: "bg-yellow-500/10",   border: "border-yellow-500/20" },
  NEED_MORE_FOLLOW_UP:  { color: "text-orange-400",   bg: "bg-orange-500/10",   border: "border-orange-500/20" },
  TRAINING_ATTENDED:    { color: "text-purple-400",   bg: "bg-purple-500/10",   border: "border-purple-500/20" },
  SEAT_RESERVED:        { color: "text-cyan-400",     bg: "bg-cyan-500/10",     border: "border-cyan-500/20" },
  JOINED:               { color: "text-emerald-400",  bg: "bg-emerald-500/10",  border: "border-emerald-500/20" },
  DEAD:                 { color: "text-red-400",       bg: "bg-red-500/10",     border: "border-red-500/20" },
};

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    NEW: "New", CALLED: "Called", NEED_MORE_FOLLOW_UP: "Follow Up",
    TRAINING_ATTENDED: "Training", SEAT_RESERVED: "Reserved",
    JOINED: "Joined", DEAD: "Dead",
  };
  return map[s] || s;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(iso);
}

function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

export default function LeadTimeline({ leadId }: { leadId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/timeline`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) setEvents(json.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [leadId]);

  useEffect(() => { void fetchTimeline(); }, [fetchTimeline]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      const cfg = TYPE_META[e.type] || TYPE_META.ACTIVITY;
      counts[e.type] = (counts[e.type] || 0) + 1;
    }
    return counts;
  }, [events]);

  const filtered = useMemo(() => {
    if (!filter) return events;
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  const grouped = useMemo(() => {
    const groups: { label: string; key: string; events: TimelineEvent[] }[] = [];
    let currentKey = "";
    for (const e of filtered) {
      const dk = dateKey(e.timestamp);
      if (dk !== currentKey) {
        currentKey = dk;
        groups.push({ label: dateLabel(e.timestamp), key: dk, events: [] });
      }
      groups[groups.length - 1].events.push(e);
    }
    return groups;
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[#D4AF37]/50" />
          <p className="text-xs text-white/30">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/25 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
          <Clock size={20} className="text-white/15" />
        </div>
        <p className="text-sm text-white/30">No activity recorded yet</p>
        <p className="mt-1 text-xs text-white/15">Events will appear here as changes are made</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
          const cfg = TYPE_META[type] || TYPE_META.ACTIVITY;
          const active = filter === type;
          return (
            <button
              key={type}
              onClick={() => setFilter(active ? null : type)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                active
                  ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm ${cfg.glow}`
                  : "border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/50 hover:border-white/15"
              }`}
            >
              {cfg.icon}
              <span>{count}</span>
            </button>
          );
        })}
        {filter && (
          <button
            onClick={() => setFilter(null)}
            className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-white/25 hover:text-white/40 transition-all"
          >
            <Filter size={10} />
            Clear
          </button>
        )}
      </div>

      {/* Grouped timeline */}
      {grouped.map((group) => (
        <div key={group.key}>
          {/* Date header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#161616] px-3 py-1.5">
              <Zap size={10} className="text-[#D4AF37]/50" />
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{group.label}</span>
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/10 px-1.5 text-[9px] font-bold text-white/40">
                {group.events.length}
              </span>
            </div>
            <div className="h-px flex-1 bg-white/[0.04]" />
          </div>

          {/* Events */}
          <div className="space-y-2 pl-1">
            {group.events.map((event) => {
              const cfg = TYPE_META[event.type] || TYPE_META.ACTIVITY;
              const isFirst = group.events.indexOf(event) === 0;

              return (
                <div
                  key={event.id}
                  className={`group relative rounded-xl border border-l-[3px] ${cfg.accent} bg-black/20 border-white/[0.04] p-4 transition-all hover:bg-white/[0.02] hover:border-white/[0.08] hover:shadow-lg ${cfg.glow}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${cfg.border} ${cfg.bg} ${cfg.color} transition-transform group-hover:scale-110`}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Top row: type badge + time */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-md border ${cfg.border} ${cfg.bg} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-white/15">·</span>
                        <span className="text-[10px] text-white/25">{relativeTime(event.timestamp)}</span>
                        {event.user && (
                          <>
                            <span className="text-[10px] text-white/15">·</span>
                            <div className="flex items-center gap-1">
                              <div className={`flex h-4 w-4 items-center justify-center rounded-full ${cfg.bg} text-[8px] font-bold ${cfg.color}`}>
                                {event.user.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="text-[10px] text-white/30">{event.user.name}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[13px] text-white/70 leading-relaxed">{event.description}</p>

                      {/* Status change visual */}
                      {event.type === "STATUS_CHANGED" && event.meta && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <StatusBadge status={event.meta.oldStatus} />
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5">
                            <ArrowRight size={10} className="text-white/30" />
                          </div>
                          <StatusBadge status={event.meta.newStatus} active />
                        </div>
                      )}

                      {/* Follow-up next date */}
                      {event.type === "FOLLOW_UP" && event.meta?.nextFollowUp && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-500/15 bg-amber-500/5 px-2.5 py-1.5">
                          <Clock size={11} className="text-amber-400/70" />
                          <span className="text-[11px] text-amber-400/70 font-medium">Next follow-up: {formatDateTime(event.meta.nextFollowUp)}</span>
                        </div>
                      )}

                      {/* Timestamp on hover */}
                      <p className="mt-1.5 text-[10px] text-white/10 group-hover:text-white/20 transition-colors">
                        {formatDateTime(event.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status, active }: { status: string; active?: boolean }) {
  const badge = STATUS_BADGE[status] || STATUS_BADGE.NEW;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${
      active
        ? `${badge.bg} ${badge.border} ${badge.color}`
        : "border-white/10 bg-white/[0.03] text-white/40"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? badge.color?.replace("text-", "bg-") : "bg-white/20"}`} />
      {statusLabel(status)}
    </span>
  );
}
