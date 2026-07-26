"use client";

import { useState, useMemo } from "react";
import {
  Trophy, Users, Target, TrendingUp, Crown,
  ChevronDown, UserCheck, UserX, Activity,
  BarChart3, Search, Star, Phone, GraduationCap,
  CalendarCheck, XCircle, CheckCircle, AlertCircle,
  Shield, Zap, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

type MemberPerf = {
  id: string; name: string; email: string; isActive: boolean;
  total: number; newLeads: number; called: number; followups: number;
  training: number; reserved: number; joined: number; dead: number;
  conversionRate: number; monthlyTarget: number; monthlyAchieved: number;
};

type TeamPerf = {
  id: string; name: string; leaderId: string; leaderName: string;
  leaderEmail: string; memberCount: number; totalLeads: number;
  newLeads: number; called: number; followups: number; training: number;
  reserved: number; joined: number; dead: number; conversionRate: number;
  topPerformer: string; monthlyTarget: number; monthlyAchieved: number;
  members: MemberPerf[];
};

type Props = {
  summary: {
    totalTeams: number; totalMembers: number; totalLeads: number;
    totalJoined: number; totalDead: number; overallConversion: number;
  };
  teams: TeamPerf[];
};

export default function TeamPerformance({ summary, teams }: Props) {
  const [search, setSearch] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"conversion" | "joined" | "leads" | "members">("conversion");

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.leaderName.toLowerCase().includes(q),
    );
  }, [teams, search]);

  const sortedTeams = useMemo(() => {
    const list = [...filteredTeams];
    switch (sortBy) {
      case "joined": return list.sort((a, b) => b.joined - a.joined);
      case "leads": return list.sort((a, b) => b.totalLeads - a.totalLeads);
      case "members": return list.sort((a, b) => b.memberCount - a.memberCount);
      default: return list.sort((a, b) => b.conversionRate - a.conversionRate);
    }
  }, [filteredTeams, sortBy]);

  const bestTeam = useMemo(() => {
    if (teams.length === 0) return null;
    return teams.reduce((best, t) => (t.conversionRate > best.conversionRate ? t : best), teams[0]);
  }, [teams]);

  const mostLeadsTeam = useMemo(() => {
    if (teams.length === 0) return null;
    return teams.reduce((best, t) => (t.joined > best.joined ? t : best), teams[0]);
  }, [teams]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  return (
    <div className="space-y-6">
      {/* ═══ Header Section ═══ */}
      <div className="rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-5 sm:p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/25">
              <Trophy size={22} className="text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Team Performance</h2>
              <p className="text-xs text-white/40 mt-0.5">
                {summary.totalTeams} team{summary.totalTeams !== 1 ? "s" : ""} · {summary.totalMembers} members · {summary.totalLeads} total leads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams or TL..."
                className="w-44 sm:w-56 rounded-xl border border-white/[0.08] bg-black/40 pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#D4AF37]/30 transition-colors"
              />
            </div>
            <div className="flex rounded-xl border border-white/[0.06] bg-black/30 p-0.5">
              {[
                { key: "conversion", label: "Conv." },
                { key: "joined", label: "Joined" },
                { key: "leads", label: "Leads" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key as typeof sortBy)}
                  className={`px-3 py-1.5 text-[10px] font-medium rounded-lg transition-all ${
                    sortBy === s.key
                      ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                      : "text-white/30 hover:text-white/50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ Summary Mini Cards ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: "Total Joined", value: summary.totalJoined, icon: <UserCheck size={15} />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
            { label: "Overall Conversion", value: `${summary.overallConversion}%`, icon: <TrendingUp size={15} />, color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/10", border: "border-[#D4AF37]/15" },
            { label: "Total Dead", value: summary.totalDead, icon: <UserX size={15} />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/15" },
            { label: "Active Teams", value: `${Math.round((teams.filter(t => t.memberCount > 0).length / Math.max(teams.length, 1)) * 100)}%`, icon: <Activity size={15} />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/15" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg}/5 p-3`}>
              <div className={`flex items-center gap-1.5 ${s.color} mb-1.5`}>
                {s.icon}
                <span className="text-[10px] uppercase tracking-wider font-semibold">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ═══ Highlight Cards ═══ */}
        {bestTeam && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-4">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Crown size={16} />
                <span className="text-[10px] uppercase tracking-wider font-semibold">Best Conversion</span>
              </div>
              <p className="text-base font-bold text-white">{bestTeam.name}</p>
              <p className="text-xs text-white/40 mt-0.5">
                {bestTeam.conversionRate}% conversion · {bestTeam.joined} joined · Lead: {bestTeam.leaderName}
              </p>
            </div>
            {mostLeadsTeam && (
              <div className="rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/[0.08] to-transparent p-4">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Zap size={16} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold">Most Joined</span>
                </div>
                <p className="text-base font-bold text-white">{mostLeadsTeam.name}</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {mostLeadsTeam.joined} joined · {mostLeadsTeam.totalLeads} total leads · {mostLeadsTeam.memberCount} members
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Team List ═══ */}
      {sortedTeams.length === 0 ? (
        <div className="rounded-[28px] border border-white/[0.06] bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-10 text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
              <Users size={24} className="text-white/15" />
            </div>
          </div>
          <p className="text-white/40 text-sm">{search ? "No teams match your search" : "No teams found"}</p>
          <p className="text-white/20 text-xs mt-1">
            {search ? "Try a different search term" : "Create teams from the Salespersons page"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedTeams.map((team, index) => {
            const targetPct = team.monthlyTarget > 0
              ? Math.min(100, Math.round((team.monthlyAchieved / team.monthlyTarget) * 100))
              : 0;
            const activeMembers = team.members.filter((m) => m.isActive).length;
            const isExpanded = expandedTeam === team.id;
            const rank = index + 1;

            return (
              <div
                key={team.id}
                className="rounded-[20px] border border-[#D4AF37]/15 bg-gradient-to-br from-[#161616] to-[#0f0f0f] overflow-hidden transition-all duration-300 hover:border-[#D4AF37]/25"
              >
                {/* ═══ Team Header ═══ */}
                <button
                  onClick={() => toggleTeam(team.id)}
                  className="w-full text-left p-4 sm:p-5 transition-colors hover:bg-white/[0.01]"
                >
                  <div className="flex items-center gap-4">
                    {/* Rank Badge */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      rank === 1
                        ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                        : rank <= 3
                        ? "bg-white/10 text-white/60 border border-white/[0.08]"
                        : "bg-white/5 text-white/30 border border-white/[0.06]"
                    }`}>
                      {rank === 1 ? <Crown size={16} /> : `#${rank}`}
                    </div>

                    {/* Team Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-white truncate">{team.name}</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium ${
                          team.conversionRate >= 20
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : team.conversionRate >= 10
                            ? "border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#D4AF37]"
                            : "border-red-500/20 bg-red-500/10 text-red-400"
                        }`}>
                          {team.conversionRate >= 20 ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                          {team.conversionRate}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-white/30 flex items-center gap-1">
                          <Shield size={10} className="text-[#D4AF37]/50" />
                          {team.leaderName}
                        </span>
                        <span className="text-[11px] text-white/20">·</span>
                        <span className="text-[11px] text-white/30 flex items-center gap-1">
                          <Users size={10} className="text-blue-400/50" />
                          {activeMembers}/{team.memberCount} active
                        </span>
                      </div>
                    </div>

                    {/* Stats Pills */}
                    <div className="hidden sm:flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-400">{team.joined}</p>
                        <p className="text-[9px] text-white/25 uppercase tracking-wider">Joined</p>
                      </div>
                      <div className="w-px h-8 bg-white/[0.06]" />
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{team.totalLeads}</p>
                        <p className="text-[9px] text-white/25 uppercase tracking-wider">Leads</p>
                      </div>
                      <div className="w-px h-8 bg-white/[0.06]" />
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-400">{team.dead}</p>
                        <p className="text-[9px] text-white/25 uppercase tracking-wider">Dead</p>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <div className={`shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                      <ChevronDown size={18} className="text-white/30" />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#D4AF37] to-emerald-400" style={{ width: `${targetPct}%` }} />
                    </div>
                    <span className="text-[10px] text-white/30 shrink-0">
                      <span className="text-white/50 font-medium">{team.monthlyAchieved}</span>/{team.monthlyTarget} target
                    </span>
                  </div>
                </button>

                {/* ═══ Expanded Body ═══ */}
                <div
                  className="overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{ maxHeight: isExpanded ? "3000px" : "0px", opacity: isExpanded ? 1 : 0 }}
                >
                  <div className="border-t border-[#D4AF37]/[0.08] px-4 sm:px-5 py-4 space-y-5">

                    {/* Status Distribution */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                      {[
                        { label: "New", value: team.newLeads, icon: <AlertCircle size={11} />, color: "text-blue-400", bg: "bg-blue-500/10" },
                        { label: "Called", value: team.called, icon: <Phone size={11} />, color: "text-yellow-400", bg: "bg-yellow-500/10" },
                        { label: "Follow Up", value: team.followups, icon: <CalendarCheck size={11} />, color: "text-orange-400", bg: "bg-orange-500/10" },
                        { label: "Training", value: team.training, icon: <GraduationCap size={11} />, color: "text-purple-400", bg: "bg-purple-500/10" },
                        { label: "Reserved", value: team.reserved, icon: <Target size={11} />, color: "text-cyan-400", bg: "bg-cyan-500/10" },
                        { label: "Joined", value: team.joined, icon: <CheckCircle size={11} />, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                        { label: "Dead", value: team.dead, icon: <XCircle size={11} />, color: "text-red-400", bg: "bg-red-500/10" },
                        { label: "Conversion", value: `${team.conversionRate}%`, icon: <BarChart3 size={11} />, color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/10" },
                      ].map((s) => (
                        <div key={s.label} className={`rounded-lg ${s.bg} border border-white/[0.04] p-2.5 text-center`}>
                          <div className={`flex items-center justify-center gap-1 ${s.color} mb-0.5`}>
                            {s.icon}
                            <span className="text-[9px] uppercase tracking-wider font-medium">{s.label}</span>
                          </div>
                          <p className="text-sm font-bold text-white">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Team Leader Info */}
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-bold">
                            {team.leaderName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{team.leaderName}</p>
                            <p className="text-[10px] text-white/30">Team Lead</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-white/30">
                          <span className="flex items-center gap-1"><Users size={10} />{team.memberCount} members</span>
                          <span className="text-white/10">|</span>
                          <span className="flex items-center gap-1"><Star size={10} className="text-[#D4AF37]/50" />Top: {team.topPerformer}</span>
                        </div>
                      </div>
                    </div>

                    {/* Team Members Table */}
                    {team.members.length > 0 && (
                      <div>
                        <h4 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2.5 flex items-center gap-1.5">
                          <Users size={11} /> Team Members ({team.members.length})
                        </h4>
                        <div className="overflow-x-auto -mx-4 sm:-mx-0">
                          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                            <table className="min-w-full">
                              <thead>
                                <tr className="border-b border-white/[0.06]">
                                  {["Member", "Leads", "New", "Called", "F/U", "Trn.", "Rsv.", "Joined", "Dead", "Conv.", "Target"].map((h) => (
                                    <th key={h} className="pb-2 text-left text-[9px] text-white/25 uppercase tracking-wider font-medium px-2 first:pl-0 last:text-right last:pr-0">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {team.members.map((m) => {
                                  const mTargetPct = m.monthlyTarget > 0 ? Math.min(100, Math.round((m.monthlyAchieved / m.monthlyTarget) * 100)) : 0;
                                  return (
                                    <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                      <td className="py-2.5 px-2 first:pl-0">
                                        <div className="flex items-center gap-2">
                                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold ${
                                            m.isActive ? "bg-blue-500/10 text-blue-400" : "bg-white/5 text-white/20"
                                          }`}>
                                            {m.name.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="text-[11px] text-white/60 truncate max-w-[100px]">{m.name}</span>
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-2 text-[11px] text-white/50 font-medium">{m.total}</td>
                                      <td className="py-2.5 px-2 text-[11px] text-blue-400/50">{m.newLeads}</td>
                                      <td className="py-2.5 px-2 text-[11px] text-yellow-400/50">{m.called}</td>
                                      <td className="py-2.5 px-2 text-[11px] text-orange-400/50">{m.followups}</td>
                                      <td className="py-2.5 px-2 text-[11px] text-purple-400/50">{m.training}</td>
                                      <td className="py-2.5 px-2 text-[11px] text-cyan-400/50">{m.reserved}</td>
                                      <td className="py-2.5 px-2 text-[11px] text-emerald-400/60 font-medium">{m.joined}</td>
                                      <td className="py-2.5 px-2 text-[11px] text-red-400/50">{m.dead}</td>
                                      <td className="py-2.5 px-2">
                                        <span className={`text-[11px] font-semibold ${
                                          m.conversionRate >= 20 ? "text-emerald-400" : m.conversionRate >= 10 ? "text-[#D4AF37]" : "text-red-400"
                                        }`}>{m.conversionRate}%</span>
                                      </td>
                                      <td className="py-2.5 px-2 text-right last:pr-0">
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                                            <div className={`h-full rounded-full ${
                                              mTargetPct >= 100 ? "bg-emerald-400" : mTargetPct >= 50 ? "bg-[#D4AF37]" : "bg-white/20"
                                            }`} style={{ width: `${mTargetPct}%` }} />
                                          </div>
                                          <span className="text-[9px] text-white/30 w-8 text-right">{mTargetPct}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {team.members.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-white/20 text-xs">No members assigned to this team</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Bottom Stats ═══ */}
      {teams.length > 0 && (
        <div className="rounded-[20px] border border-[#D4AF37]/10 bg-gradient-to-br from-[#151515] to-[#0a0a0a] p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Teams", value: summary.totalTeams, icon: <Users size={14} />, color: "text-[#D4AF37]" },
              { label: "Members", value: summary.totalMembers, icon: <Users size={14} />, color: "text-blue-400" },
              { label: "Total Leads", value: summary.totalLeads, icon: <BarChart3 size={14} />, color: "text-white" },
              { label: "Total Joined", value: summary.totalJoined, icon: <UserCheck size={14} />, color: "text-emerald-400" },
              { label: "Total Dead", value: summary.totalDead, icon: <UserX size={14} />, color: "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ${s.color}`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{s.value}</p>
                  <p className="text-[9px] text-white/25 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
