"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search, Users, UserCheck, UserX, Phone,
  Mail, Calendar, ChevronRight, Star, Target, Clock,
  X, Briefcase, Activity, BarChart3, PhoneCall,
} from "lucide-react";
import { formatDateShort, formatDateTime } from "@/lib/format-date";
import { supabase } from "@/lib/supabase";

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  NEW: { label: "New", color: "text-blue-400", bg: "bg-blue-500/15", dot: "bg-blue-400" },
  CALLED: { label: "Called", color: "text-yellow-400", bg: "bg-yellow-500/15", dot: "bg-yellow-400" },
  TRAINING_ATTENDED: { label: "Training", color: "text-purple-400", bg: "bg-purple-500/15", dot: "bg-purple-400" },
  SEAT_RESERVED: { label: "Reserved", color: "text-cyan-400", bg: "bg-cyan-500/15", dot: "bg-cyan-400" },
  NEED_MORE_FOLLOW_UP: { label: "Follow Up", color: "text-orange-400", bg: "bg-orange-500/15", dot: "bg-orange-400" },
  JOINED: { label: "Joined", color: "text-emerald-400", bg: "bg-emerald-500/15", dot: "bg-emerald-400" },
  DEAD: { label: "Dead", color: "text-red-400", bg: "bg-red-500/15", dot: "bg-red-400" },
};

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  monthlyTarget: number;
  currentMonthTarget: number;
  createdAt: string;
  _count: { leads: number };
  statusCounts: Record<string, number>;
  joinedCount: number;
  monthlyJoinedCount: number;
  deadCount: number;
  lastFollowUpAt: string | null;
}

export default function TeamOverview() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const r = await fetch("/api/team-leader/team", { cache: "no-store" });
      const j = await r.json();
      if (j.success) setMembers(j.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => { void fetchMembers(); }, 600);
  }, [fetchMembers]);

  useEffect(() => { void fetchMembers(); }, [fetchMembers]);

  useEffect(() => {
    const channel = supabase
      .channel("tl-team-overview-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "StatusHistory" }, () => scheduleRefresh())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Lead" }, () => scheduleRefresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "FollowUp" }, () => scheduleRefresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [scheduleRefresh]);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalLeads = members.reduce((s, m) => s + m._count.leads, 0);
  const totalJoined = members.reduce((s, m) => s + m.joinedCount, 0);
  const totalMonthlyJoined = members.reduce((s, m) => s + m.monthlyJoinedCount, 0);
  const totalDead = members.reduce((s, m) => s + m.deadCount, 0);
  const activeCount = members.filter((m) => m.isActive).length;
  const conversionRate = totalLeads > 0 ? Math.round((totalJoined / totalLeads) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
        <div className="h-10 animate-pulse rounded-xl bg-white/[0.04]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-[#161616] p-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="h-3 w-20 animate-pulse rounded-lg bg-white/[0.04]" />
              </div>
              <div className="h-6 w-6 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="mt-3 h-1.5 w-full animate-pulse rounded-full bg-white/[0.04]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Team Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Members", value: members.length, sub: `${activeCount} active`, icon: <Users size={16} />, accent: "text-[#D4AF37]" },
          { label: "Total Leads", value: totalLeads, sub: `${conversionRate}% conv.`, icon: <BarChart3 size={16} />, accent: "text-blue-400" },
          { label: "Joined", value: totalMonthlyJoined, sub: `of ${totalLeads} total`, icon: <UserCheck size={16} />, accent: "text-emerald-400" },
          { label: "Dead", value: totalDead, sub: `${totalLeads > 0 ? Math.round((totalDead / totalLeads) * 100) : 0}% loss`, icon: <UserX size={16} />, accent: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-[#161616] p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={s.accent}>{s.icon}</span>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-white/25">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full rounded-xl border border-white/[0.06] bg-[#161616] pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#D4AF37]/30 transition-colors" />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Member Cards ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 mb-3">
            <Users size={24} className="text-white/15" />
          </div>
          <p className="text-white/40 text-sm">No team members</p>
          <p className="text-white/20 text-xs mt-1">{search ? "Try a different search" : "Members will appear here"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const totalStatuses = Object.values(m.statusCounts).reduce((a, b) => a + b, 0);
            const targetPct = m.currentMonthTarget > 0 ? Math.min(100, Math.round((m.monthlyJoinedCount / m.currentMonthTarget) * 100)) : 0;
            const statusBreakdown = Object.entries(m.statusCounts)
              .filter(([, c]) => c > 0)
              .sort(([, a], [, b]) => b - a);

            return (
              <button key={m.id} onClick={() => setSelectedMember(m)}
                className="w-full text-left rounded-xl border border-white/[0.06] bg-[#161616] p-4 transition-all hover:border-[#D4AF37]/20 hover:bg-[#1a1a1a] active:scale-[0.99]"
              >
                {/* Top row: avatar + name + status */}
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold text-sm ${
                    m.isActive ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "bg-white/5 text-white/20"
                  }`}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{m.name}</p>
                      <span className={`shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${
                        m.isActive
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-red-500/20 bg-red-500/10 text-red-400"
                      }`}>{m.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    </div>
                  <ChevronRight size={16} className="shrink-0 text-white/15" />
                </div>

                {/* Metrics row */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    <Briefcase size={11} className="text-white/25" />
                    <span className="text-[11px] text-white/40">{m._count.leads} <span className="text-white/20">leads</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserCheck size={11} className="text-emerald-400/40" />
                    <span className="text-[11px] text-emerald-400/60">{m.monthlyJoinedCount} <span className="text-white/20">joined/mo</span></span>
                  </div>
                  {m.lastFollowUpAt && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Clock size={9} className="text-white/20" />
                      <span className="text-[10px] text-white/20">{formatDateShort(m.lastFollowUpAt)}</span>
                    </div>
                  )}
                </div>

                {/* Target progress */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/25 flex items-center gap-1"><Target size={9} />Target</span>
                    <span className="text-[10px] text-white/30">{m.monthlyJoinedCount}/{m.currentMonthTarget} ({targetPct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      targetPct >= 100 ? "bg-emerald-400" : targetPct >= 50 ? "bg-[#D4AF37]" : "bg-white/20"
                    }`} style={{ width: `${targetPct}%` }} />
                  </div>
                </div>

                {/* Status breakdown mini bars */}
                {statusBreakdown.length > 0 && (
                  <div className="flex gap-1 mt-2.5">
                    {statusBreakdown.map(([status, count]) => {
                      const meta = STATUS_META[status];
                      if (!meta) return null;
                      const pct = totalStatuses > 0 ? Math.round((count / totalStatuses) * 100) : 0;
                      return (
                        <div key={status} className="flex items-center gap-1 group/tooltip" title={`${meta.label}: ${count}`}>
                          <span className={`h-1.5 rounded-full ${meta.dot}`} style={{ width: `${Math.max(pct * 0.4, 3)}px` }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Detail Slide-Over Panel ── */}
      {selectedMember && (
        <MemberDetailPanel member={selectedMember} onClose={() => { setSelectedMember(null); void fetchMembers(); }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MEMBER DETAIL PANEL
   ═══════════════════════════════════════════════ */

interface DetailMember extends Member {
  recentLeads: {
    id: string; name: string | null; phone: string; status: string;
    followUpCount: number; createdAt: string; isPriority: boolean;
    lastFollowUp: string | null; nextFollowUp: string | null;
  }[];
  totalFollowups: number;
  statusCounts: Record<string, number>;
}

function MemberDetailPanel({ member, onClose }: { member: Member; onClose: () => void }) {
  const [data, setData] = useState<DetailMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "leads">("overview");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/team-leader/team/${member.id}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [member.id]);

  const targetPct = member.currentMonthTarget > 0 ? Math.min(100, Math.round((member.monthlyJoinedCount / member.currentMonthTarget) * 100)) : 0;
  const totalStatuses = data ? Object.values(data.statusCounts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative flex flex-col h-full w-full sm:max-w-lg bg-[#0a0a0a] sm:border-l border-white/[0.06] shadow-[0_0_60px_-15px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="shrink-0 bg-[#0a0a0a] border-b border-white/[0.06] px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 sm:pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold text-sm ${
                member.isActive ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "bg-white/5 text-white/20"
              }`}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">{member.name}</h2>
              </div>
            </div>
            <button onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40 hover:text-white/70 transition-all">
              <X size={16} />
            </button>
          </div>

          {/* Quick contact */}
          <div className="flex gap-2 mt-3">
            {member.phone && (
              <a href={`tel:${member.phone}`}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] text-white/40 hover:text-emerald-400 transition-colors">
                <Phone size={11} />Call
              </a>
            )}
            <a href={`mailto:${member.email}`}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] text-white/40 hover:text-blue-400 transition-colors">
              <Mail size={11} />Email
            </a>
            <span className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] ${
              member.isActive ? "border-emerald-500/20 text-emerald-400/60" : "border-red-500/20 text-red-400/60"
            }`}>
              {member.isActive ? <><Activity size={11} />Active</> : <><UserX size={11} />Inactive</>}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex border-b border-white/[0.06] px-5">
          {(["overview", "leads"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`relative px-4 py-3 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                tab === t ? "text-[#D4AF37]" : "text-white/30 hover:text-white/50"
              }`}>
              {t === "overview" ? "Overview" : "Recent Leads"}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-full" />}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="p-5 space-y-5">

              {/* ═══ OVERVIEW ═══ */}
              {tab === "overview" && (
                <>
                  {/* Target card */}
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-white/25 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <Target size={11} />Monthly Target
                      </span>
                      <span className="text-sm font-bold text-white">{targetPct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden mb-2">
                      <div className={`h-full rounded-full transition-all duration-700 ${
                        targetPct >= 100 ? "bg-emerald-400" : targetPct >= 50 ? "bg-[#D4AF37]" : "bg-white/20"
                      }`} style={{ width: `${targetPct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/30">{member.monthlyJoinedCount} joined this month</span>
                      <span className="text-white/30">Target: {member.currentMonthTarget}</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Total", value: totalStatuses, accent: "text-white" },
                      { label: "Joined", value: member.monthlyJoinedCount, accent: "text-emerald-400" },
                      { label: "Dead", value: member.deadCount, accent: "text-red-400" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 text-center">
                        <p className={`text-lg font-bold ${s.accent}`}>{s.value}</p>
                        <p className="text-[10px] text-white/25">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Status breakdown */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Status Breakdown</h3>
                    {totalStatuses === 0 ? (
                      <p className="text-[11px] text-white/20">No leads yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(data?.statusCounts || {})
                          .filter(([, c]) => c > 0)
                          .sort(([, a], [, b]) => b - a)
                          .map(([status, count]) => {
                            const meta = STATUS_META[status];
                            if (!meta) return null;
                            const pct = totalStatuses > 0 ? Math.round((count / totalStatuses) * 100) : 0;
                            return (
                              <div key={status} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                                    <span className={`text-[11px] ${meta.color}`}>{meta.label}</span>
                                  </div>
                                  <span className="text-[11px] text-white/30">{count} <span className="text-white/15">({pct}%)</span></span>
                                </div>
                                <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                                  <div className={`h-full rounded-full ${meta.dot}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Activity */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Activity</h3>
                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/30 flex items-center gap-1.5"><PhoneCall size={10} />Total Follow-ups</span>
                        <span className="text-[11px] text-white/50 font-medium">{data?.totalFollowups || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/30 flex items-center gap-1.5"><Clock size={10} />Last Follow-up</span>
                        <span className="text-[11px] text-white/50">{data?.lastFollowUpAt ? formatDateTime(data.lastFollowUpAt) : "Never"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/30 flex items-center gap-1.5"><Calendar size={10} />Member Since</span>
                        <span className="text-[11px] text-white/50">{formatDateShort(member.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ═══ RECENT LEADS ═══ */}
              {tab === "leads" && (
                <>
                  {!data?.recentLeads || data.recentLeads.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-white/30 text-sm">No leads yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {data.recentLeads.map((lead) => {
                        const meta = STATUS_META[lead.status];
                        return (
                          <Link key={lead.id} href={`/team-leader/team-leads?memberId=${member.id}`}
                            className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-[#D4AF37]/15 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                {lead.isPriority && <Star size={10} className="shrink-0 text-[#D4AF37]" fill="currentColor" />}
                                <p className="text-[13px] font-medium text-white truncate">{lead.name || "Unknown"}</p>
                              </div>
                              {meta && (
                                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${meta.bg} border-white/[0.04] ${meta.color}`}>
                                  <span className={`h-1 w-1 rounded-full ${meta.dot}`} />
                                  {meta.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/25">
                              <span className="flex items-center gap-1"><Phone size={8} />{lead.phone}</span>
                              <span className="flex items-center gap-1"><Clock size={8} />{lead.followUpCount} f/u</span>
                              <span className="ml-auto">{formatDateShort(lead.createdAt)}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
