"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Users, Target, TrendingUp, UserCheck, Clock,
  Activity, ChevronRight, Briefcase, AlertTriangle,
  ArrowUpRight, Calendar, Phone, BarChart3,
  CheckCircle, XCircle, PhoneCall, GraduationCap, Armchair,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api-fetch";
import { formatDateShort } from "@/lib/format-date";

import TlStatsCards from "@/components/team-leader/dashboard/TlStatsCards";
import TlTodayFollowUps from "@/components/team-leader/dashboard/TlTodayFollowUps";
import TlRecentActivity from "@/components/team-leader/dashboard/TlRecentActivity";

/* ── Types ── */

interface SelfData {
  totalLeads: number;
  newLeads: number;
  calledLeads: number;
  trainingLeads: number;
  reservedLeads: number;
  joined: number;
  dead: number;
  conversionRate: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  upcomingFollowUps: number;
  todayNewLeads: number;
  todayJoined: number;
  todayFollowUpDetails: {
    id: string; name: string | null; phone: string; status: string;
    remarks: string | null; nextFollowUp: string | null;
  }[];
  recentActivities: {
    id: string; oldStatus: string; newStatus: string; changedAt: string;
    lead: { name: string | null; phone: string };
    changedBy?: { name: string } | null;
  }[];
}

interface TeamScopeData {
  totalLeads: number;
  joined: number;
  dead: number;
  newLeads: number;
  calledLeads: number;
  trainingLeads: number;
  reservedLeads: number;
  followUpNeeded: number;
  conversionRate: number;
  todayFollowUps: number;
  todayNewLeads: number;
  todayJoined: number;
  overdueFollowUps: number;
  recentFollowUps: {
    id: string; createdAt: string;
    user?: { name: string } | null;
    lead?: { name: string | null; phone: string } | null;
  }[];
  dailyTrend: { date: string; count: number }[];
}

interface TeamPerfMember {
  id: string;
  name: string;
  totalLeads: number;
  joined: number;
  dead: number;
  followups: number;
  todayFollowups: number;
  overdue: number;
  overdueLeads: { id: string; name: string | null; phone: string; nextFollowUp: string | null }[];
}

interface DashboardData {
  self: SelfData;
  team: TeamScopeData;
  teamSize: number;
  teamPerformance: TeamPerfMember[];
  todayFollowUpsByMember: {
    userId: string; userName: string; count: number;
    leads: { id: string; name: string | null; phone: string; status: string; nextFollowUp: string | null }[];
  }[];
  teamActivity: {
    id: string; oldStatus: string; newStatus: string; changedAt: string;
    lead: { name: string | null; phone: string };
    changedBy: { name: string } | null;
  }[];
}

type Tab = "self" | "team";

export default function TeamLeaderDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("self");

  const fetchData = useCallback(async () => {
    try {
      const r = await apiFetch("/api/team-leader/dashboard");
      const j = await r.json();
      if (j.success) setData(j.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void fetchData(); }, 600);
  }, [fetchData]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("tl-dashboard-leads")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "StatusHistory" }, () => scheduleRefresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [scheduleRefresh]);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        {/* Tab skeleton */}
        <div className="flex rounded-xl border border-[#D4AF37]/20 bg-[#161616] p-1">
          <div className="flex-1 h-10 rounded-lg bg-[#D4AF37]/5" />
          <div className="flex-1 h-10 rounded-lg bg-[#D4AF37]/5 ml-1" />
        </div>
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#D4AF37]/20 bg-[#161616] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10" />
              <div className="h-7 w-12 mt-4 rounded bg-zinc-800" />
              <div className="h-3 w-20 mt-2 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
        {/* Content skeletons */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#161616] p-4">
            <div className="h-5 w-32 rounded bg-zinc-800 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-zinc-800/50" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#161616] p-4">
            <div className="h-5 w-28 rounded bg-zinc-800 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-zinc-800/50" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-white/30 text-sm py-10 text-center">Failed to load dashboard.</p>;

  const { self: myLeads, team: teamScope } = data;

  const selfStats = {
    totalLeads: myLeads.totalLeads,
    newLeads: myLeads.newLeads,
    calledLeads: myLeads.calledLeads,
    trainingLeads: myLeads.trainingLeads,
    reservedLeads: myLeads.reservedLeads,
    joinedLeads: myLeads.joined,
    deadLeads: myLeads.dead,
    todayFollowUps: myLeads.todayFollowUps,
    overdueFollowUps: myLeads.overdueFollowUps,
    upcomingFollowUps: myLeads.upcomingFollowUps,
    conversionRate: myLeads.conversionRate,
  };



  return (
    <div className="space-y-5">

      {/* ── Tabs ── */}
      <div className="flex rounded-xl border border-[#D4AF37]/20 bg-[#161616] p-1">
        {([
          { key: "self" as Tab, label: "My Leads", icon: <Briefcase size={13} /> },
          { key: "team" as Tab, label: "Team", icon: <Users size={13} /> },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all ${
              tab === t.key
                ? "bg-gradient-to-r from-[#D4AF37] to-[#c9a430] text-black border border-transparent shadow-lg shadow-[#D4AF37]/20"
                : "text-zinc-400 hover:text-[#D4AF37] border border-transparent"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════ MY LEADS TAB ════════════════ */}
      {tab === "self" && (
        <>
          <TlStatsCards stats={selfStats} />

          <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
            <TlTodayFollowUps followUps={myLeads.todayFollowUpDetails} />
            <TlRecentActivity activities={myLeads.recentActivities} />
          </div>
        </>
      )}

      {/* ════════════════ TEAM TAB ════════════════ */}
      {tab === "team" && (
        <>
          {/* ── Top Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Team Leads", value: teamScope.totalLeads, icon: <Briefcase size={16} /> },
              { label: "Today New", value: teamScope.todayNewLeads, icon: <ArrowUpRight size={16} /> },
              { label: "Follow-ups Done", value: teamScope.todayFollowUps, icon: <Phone size={16} /> },
              { label: "Pending Today", value: (data.todayFollowUpsByMember || []).reduce((s, m) => s + m.count, 0), icon: <Clock size={16} /> },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-[#D4AF37]/20 bg-[#161616] p-4 transition hover:border-[#D4AF37]/60">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                    {s.icon}
                  </div>
                </div>
                <p className="mt-4 text-2xl font-bold text-white">{s.value}</p>
                <p className="mt-1 text-xs text-zinc-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── Today's Follow-ups Queue (member-wise) ── */}
          {data.todayFollowUpsByMember && data.todayFollowUpsByMember.length > 0 && (
            <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#161616] p-4">
              <div className="flex items-center gap-2 mb-3 border-b border-[#D4AF37]/10 pb-3">
                <Calendar size={18} className="text-[#D4AF37]" />
                <h2 className="text-base font-semibold text-white">Today&apos;s Follow-ups</h2>
              </div>
              <div className="space-y-3">
                {data.todayFollowUpsByMember
                  .sort((a, b) => b.count - a.count)
                  .map((member) => (
                    <div key={member.userId}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[9px] font-semibold">
                          {member.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-white">{member.userName}</span>
                        <span className="text-[10px] text-zinc-500 ml-auto">{member.count} lead{member.count > 1 ? "s" : ""}</span>
                      </div>
                      <div className="space-y-1 pl-8">
                        {member.leads.slice(0, 5).map((l) => (
                          <div key={l.id} className="flex items-center gap-2 rounded-xl border border-[#D4AF37]/10 bg-[#111111] px-2.5 py-1.5">
                            <span className="text-[10px] text-white min-w-0 flex-1 truncate">{l.name || l.phone}</span>
                            <span className="text-[8px] text-zinc-500 uppercase">{l.status}</span>
                            <span className="text-[9px] text-zinc-600 shrink-0">
                              {l.nextFollowUp ? formatDateShort(l.nextFollowUp) : ""}
                            </span>
                          </div>
                        ))}
                        {member.leads.length > 5 && (
                          <p className="text-[9px] text-zinc-600 pl-1">+{member.leads.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── Who's Behind (Overdue members) ── */}
          {data.teamPerformance.filter((m) => m.overdue > 0).length > 0 && (
            <div className="rounded-2xl border border-red-500/20 bg-[#161616] p-4">
              <div className="flex items-center gap-2 mb-3 border-b border-red-500/10 pb-3">
                <AlertTriangle size={18} className="text-red-400" />
                <h2 className="text-base font-semibold text-white">Needs Attention</h2>
              </div>
              <div className="space-y-2">
                {data.teamPerformance
                  .filter((m) => m.overdue > 0)
                  .sort((a, b) => b.overdue - a.overdue)
                  .map((m) => (
                    <div key={m.id} className="rounded-xl border border-red-500/10 bg-[#111111] p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <Link href={`/team-leader/team/${m.id}`} className="flex items-center gap-2 text-xs font-medium text-white hover:text-red-400 transition-colors">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-red-400 text-[9px] font-semibold">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          {m.name}
                        </Link>
                        <span className="text-[11px] font-semibold text-red-400">{m.overdue} overdue</span>
                      </div>
                      {m.overdueLeads && m.overdueLeads.length > 0 && (
                        <div className="space-y-1 pl-8">
                          {m.overdueLeads.slice(0, 3).map((l) => (
                            <div key={l.id} className="flex items-center gap-2 text-[9px] text-zinc-500">
                              <span className="text-zinc-400 truncate">{l.name || l.phone}</span>
                              <span className="shrink-0 text-red-400/60">due {l.nextFollowUp ? formatDateShort(l.nextFollowUp) : "—"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── Team Member Grid ── */}
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#161616] p-4">
            <div className="flex items-center justify-between mb-3 border-b border-[#D4AF37]/10 pb-3">
              <h2 className="text-base font-semibold text-white">Team Performance</h2>
              <Link href="/team-leader/team" className="text-[10px] text-[#D4AF37]/50 hover:text-[#D4AF37] flex items-center gap-1 transition-colors">
                Manage Team <ChevronRight size={10} />
              </Link>
            </div>
            {data.teamPerformance.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-4">No team members assigned</p>
            ) : (
              <div className="space-y-1.5">
                {data.teamPerformance
                  .sort((a, b) => b.todayFollowups - a.todayFollowups || b.joined - a.joined)
                  .map((m) => {
                    const mConv = m.totalLeads > 0 ? Math.round((m.joined / m.totalLeads) * 100) : 0;
                    return (
                      <div key={m.id} className="flex items-center justify-between rounded-xl border border-[#D4AF37]/10 bg-[#111111] px-3 py-2.5">
                        <Link href={`/team-leader/team/${m.id}`} className="flex items-center gap-2 min-w-0 hover:text-[#D4AF37] transition-colors">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[9px] font-semibold">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-white truncate">{m.name}</span>
                        </Link>
                        <div className="flex items-center gap-3 text-[10px] shrink-0">
                          <div className="text-center">
                            <p className="text-zinc-500">Leads</p>
                            <p className="text-white font-semibold">{m.totalLeads}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-zinc-500">Joined</p>
                            <p className="text-emerald-400 font-semibold">{m.joined}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-zinc-500">Today F/U</p>
                            <p className="text-orange-400 font-semibold">{m.todayFollowups}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-zinc-500">Overdue</p>
                            <p className={`font-semibold ${m.overdue > 0 ? "text-red-400" : "text-zinc-500"}`}>{m.overdue}</p>
                          </div>
                          <div className="text-center ml-1">
                            <p className={`text-xs font-bold ${mConv >= 30 ? "text-emerald-400" : mConv >= 15 ? "text-[#D4AF37]" : "text-zinc-500"}`}>{mConv}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* ── Today's Activity Log ── */}
          {data.teamActivity && data.teamActivity.length > 0 && (
            <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#161616] p-4">
              <div className="flex items-center gap-2 mb-3 border-b border-[#D4AF37]/10 pb-3">
                <Clock size={18} className="text-[#D4AF37]" />
                <h2 className="text-base font-semibold text-white">Today&apos;s Activity</h2>
              </div>
              <div className="space-y-2">
                {data.teamActivity.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 rounded-xl border border-[#D4AF37]/10 bg-[#111111] px-2.5 py-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
                      <Users size={10} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        <span className="text-white font-medium">{a.changedBy?.name || "Someone"}</span>
                        {" "}&rarr;{" "}
                        <span className="text-zinc-300">{a.lead.name || a.lead.phone}</span>
                        {" "}
                        <span className="text-zinc-500">{a.oldStatus}</span>
                        {" "}&rarr;{" "}
                        <span className="font-medium text-[#D4AF37]">{a.newStatus}</span>
                      </p>
                    </div>
                    <span className="text-[9px] text-zinc-600 shrink-0">{formatDateShort(a.changedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick Actions ── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Distribute Leads", href: "/team-leader/team-leads", icon: <Target size={18} /> },
              { label: "My Leads", href: "/team-leader/leads", icon: <Briefcase size={18} /> },
              { label: "Team Members", href: "/team-leader/team", icon: <Users size={18} /> },
              { label: "Reports", href: "/team-leader/reports", icon: <BarChart3 size={18} /> },
            ].map((a) => (
              <Link key={a.label} href={a.href}
                className="flex items-center gap-3 rounded-2xl border border-[#D4AF37]/20 bg-[#161616] px-4 py-3.5 text-sm text-zinc-400 hover:border-[#D4AF37]/60 hover:text-white transition-all"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                  {a.icon}
                </div>
                {a.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
