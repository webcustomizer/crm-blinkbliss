"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  TrendingUp, Users, UserCheck, UserX,
  ChevronRight, Briefcase, Phone, Clock,
  ArrowUpRight, PhoneCall, GraduationCap, Armchair,
  CheckCircle, XCircle,
} from "lucide-react";
import { formatDateTime } from "@/lib/format-date";
import { supabase } from "@/lib/supabase";

const FILTERS = [
  { key: "TODAY", label: "Today" },
  { key: "WEEK", label: "7 Days" },
  { key: "MONTH", label: "30 Days" },
  { key: "QUARTER", label: "Quarter" },
  { key: "ALL", label: "All Time" },
] as const;

interface ReportsData {
  filter: string;
  totalLeads: number;
  joinedCount: number;
  deadCount: number;
  conversionRate: number;
  statusCounts: Record<string, number>;
  memberPerformance: {
    id: string; name: string; total: number;
    newLeads: number; called: number; training: number; reserved: number;
    joined: number; dead: number; followups: number; conversionRate: number;
  }[];
  dailyTrend: { date: string; count: number }[];
  conversionFlows: Record<string, number>;
  topSources: { source: string; count: number }[];
  topCities: { city: string; count: number }[];
  recentActivities: {
    id: string; oldStatus: string; newStatus: string; changedAt: string;
    lead: { name: string | null; phone: string };
    changedBy: { name: string } | null;
  }[];
}

export default function TeamReports() {
  const [filter, setFilter] = useState<string>("ALL");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (f: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/team-leader/reports?filter=${f}`, { cache: "no-store" });
      const j = await r.json();
      if (j.success) setData(j.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => { void fetchData(filter); }, 600);
  }, [filter, fetchData]);

  useEffect(() => { void fetchData(filter); }, [filter, fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("tl-reports-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "StatusHistory" }, () => scheduleRefresh())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Lead" }, () => scheduleRefresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [scheduleRefresh]);

  return (
    <div className="space-y-5">

      {/* ── Date Filter ── */}
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-[#161616] p-1">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-1 rounded-lg py-2 text-[11px] font-medium transition-all ${
              filter === f.key ? "bg-[#D4AF37] text-black" : "text-white/35 hover:text-white/55"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
          <div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />
          <div className="h-32 animate-pulse rounded-xl bg-white/[0.04]" />
          <div className="h-60 animate-pulse rounded-xl bg-white/[0.04]" />
        </div>
      ) : !data ? (
        <p className="text-white/30 text-sm text-center py-10">Failed to load reports.</p>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { label: "Total Leads", value: data.totalLeads, icon: <Briefcase size={16} />, border: "border-blue-500/15", text: "text-blue-400" },
              { label: "Joined", value: data.joinedCount, icon: <UserCheck size={16} />, border: "border-emerald-500/15", text: "text-emerald-400" },
              { label: "Dead", value: data.deadCount, icon: <UserX size={16} />, border: "border-red-500/15", text: "text-red-400" },
              { label: "Conversion", value: `${data.conversionRate}%`, icon: <TrendingUp size={16} />, border: "border-[#D4AF37]/15", text: "text-[#D4AF37]" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl border ${k.border} bg-[#161616] p-3.5`}>
                <div className={`flex items-center gap-1.5 ${k.text} mb-2`}>
                  {k.icon}
                  <span className="text-[10px] uppercase tracking-wider font-semibold">{k.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{k.value}</p>
              </div>
            ))}
          </div>

          {/* ── Status Distribution Grid ── */}
          <div className="rounded-xl border border-white/[0.06] bg-[#161616] p-4">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Status Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              {[
                { label: "New", key: "NEW", icon: <ArrowUpRight size={12} />, color: "text-blue-400", border: "border-blue-500/10" },
                { label: "Called", key: "CALLED", icon: <PhoneCall size={12} />, color: "text-yellow-400", border: "border-yellow-500/10" },
                { label: "Training", key: "TRAINING_ATTENDED", icon: <GraduationCap size={12} />, color: "text-purple-400", border: "border-purple-500/10" },
                { label: "Reserved", key: "SEAT_RESERVED", icon: <Armchair size={12} />, color: "text-cyan-400", border: "border-cyan-500/10" },
                { label: "Follow Up", key: "NEED_MORE_FOLLOW_UP", icon: <Phone size={12} />, color: "text-orange-400", border: "border-orange-500/10" },
                { label: "Joined", key: "JOINED", icon: <CheckCircle size={12} />, color: "text-emerald-400", border: "border-emerald-500/10" },
                { label: "Dead", key: "DEAD", icon: <XCircle size={12} />, color: "text-red-400", border: "border-red-500/10" },
              ].map((st) => (
                <div key={st.key} className={`rounded-lg bg-white/[0.02] border ${st.border} p-2.5 text-center`}>
                  <div className={`flex items-center justify-center gap-1 mb-1 ${st.color}`}>
                    {st.icon}
                    <span className="text-[10px] uppercase tracking-wider">{st.label}</span>
                  </div>
                  <p className="text-base font-bold text-white">{data.statusCounts[st.key] || 0}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Daily Trend ── */}
          {data.dailyTrend.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-[#161616] p-4">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Daily Lead Inflow</h3>
              <div className="flex items-end gap-2 h-20 pt-2">
                {(() => {
                  const maxC = Math.max(...data.dailyTrend.map((d) => d.count), 1);
                  return data.dailyTrend.map((d) => {
                    const heightPct = Math.max((d.count / maxC) * 100, 8);
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[8px] text-white/40 font-medium">{d.count}</span>
                        <div className="w-full bg-white/[0.04] rounded-t overflow-hidden flex items-end h-full">
                          <div className="w-full bg-gradient-to-t from-blue-500/30 to-blue-400 rounded-t transition-all duration-500" style={{ height: `${heightPct}%` }} />
                        </div>
                        <span className="text-[8px] text-white/25 truncate max-w-full">{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* ── Team Performance Table ── */}
          <div className="rounded-xl border border-white/[0.06] bg-[#161616] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Member Performance</h3>
              <Link href="/team-leader/team" className="text-[10px] text-[#D4AF37]/50 hover:text-[#D4AF37] flex items-center gap-1 transition-colors">
                Manage <ChevronRight size={10} />
              </Link>
            </div>
            {data.memberPerformance.length === 0 ? (
              <p className="text-[11px] text-white/20 text-center py-4">No team members</p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Member", "Leads", "New", "Called", "Trn.", "Rsv.", "Joined", "Dead", "Conv.", "F/U"].map((h) => (
                        <th key={h} className="pb-2 text-left text-[9px] text-white/25 uppercase tracking-wider font-medium first:w-auto last:text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.memberPerformance
                      .sort((a, b) => b.total - a.total)
                      .map((m) => (
                        <tr key={m.id} className="border-b border-white/[0.03]">
                          <td className="py-2.5">
                            <Link href={`/team-leader/team/${m.id}`} className="flex items-center gap-2 text-[11px] text-white/70 hover:text-[#D4AF37] transition-colors">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[8px] font-semibold">{m.name.charAt(0)}</div>
                              <span className="truncate">{m.name}</span>
                            </Link>
                          </td>
                          <td className="py-2.5 text-[11px] text-white/60 font-medium">{m.total}</td>
                          <td className="py-2.5 text-[11px] text-blue-400/60">{m.newLeads}</td>
                          <td className="py-2.5 text-[11px] text-yellow-400/60">{m.called}</td>
                          <td className="py-2.5 text-[11px] text-purple-400/60">{m.training}</td>
                          <td className="py-2.5 text-[11px] text-cyan-400/60">{m.reserved}</td>
                          <td className="py-2.5 text-[11px] text-emerald-400/70 font-medium">{m.joined}</td>
                          <td className="py-2.5 text-[11px] text-red-400/60">{m.dead}</td>
                          <td className="py-2.5 text-[11px] font-semibold text-white/50">{m.conversionRate}%</td>
                          <td className="py-2.5 text-[11px] text-orange-400/50 text-right">{m.followups}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Recent Activity ── */}
          {data.recentActivities.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-[#161616] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-[#D4AF37]/60" />
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Recent Changes</h3>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {data.recentActivities.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[#D4AF37]/60">
                      <Users size={10} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        <span className="text-white/70 font-medium">{a.changedBy?.name || "Someone"}</span>
                        {" "}changed <span className="text-white/70">{a.lead.name || a.lead.phone}</span>
                        {" "}from <span className="text-white/40">{a.oldStatus}</span>
                        {" "}to <span className="font-medium text-[#D4AF37]/80">{a.newStatus}</span>
                      </p>
                      <p className="text-[9px] text-white/15 mt-0.5">{formatDateTime(a.changedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
