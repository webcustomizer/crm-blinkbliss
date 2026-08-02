"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Edit, Target, KeyRound, UserX, UserCheck, Shield, ShieldOff, Crown,
  ChevronDown, Users, User, Plus, ChevronUp, UserMinus, Star,
  TrendingUp, Award, BarChart3,
} from "lucide-react";
import EditSalespersonDialog from "./EditSalespersonDialog";
import ResetSalespersonPasswordDialog from "./ResetSalespersonPasswordDialog";
import AddSalespersonDialog from "./AddSalespersonDialog";
import SetGoalDialog from "./SetGoalDialog";
import type { UserWithTarget } from "@/types/lead";

interface Actions {
  fetchData: () => void;
  month: number;
  year: number;
  assignToTeam: (userId: string, teamLeaderId: string) => void;
  promoteToTL: (userId: string, name: string) => void;
  demoteTL: (userId: string, name: string) => void;
  toggleActive: (userId: string, isActive: boolean, name: string) => void;
  markEligible: (userId: string, name: string) => void;
  revokeEligible: (userId: string, name: string) => void;
  setEditUser: (u: UserWithTarget) => void;
  setResetPasswordUser: (u: UserWithTarget) => void;
  teamLeaders: { id: string; name: string }[];
}

const ActionButtons = memo(function ActionButtons({ user, actions }: { user: UserWithTarget; actions: Actions }) {
  const isTL = user.role === "TEAM_LEAD";
  const totalGoal = (user.monthlyTarget ?? 50) * (user.targetMonths ?? 3);
  const achieved = user.totalJoinedLeads || 0;
  const autoEligible = achieved >= totalGoal;

  return (
    <div className="flex items-center gap-1">
      {user.eligibleForTeamLeader && (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-1 text-[9px] font-semibold text-emerald-400">
          <Star size={9} fill="currentColor" /> Eligible
        </span>
      )}
      {!user.eligibleForTeamLeader && autoEligible && user.role !== "TEAM_LEAD" && (
        <button onClick={() => actions.markEligible(user.id, user.name)}
          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-400/60 hover:border-emerald-500 hover:text-emerald-400 transition-all"
          title="Mark as eligible for Team Leader">
          <Star size={13} />
        </button>
      )}
      {user.eligibleForTeamLeader && (
        <button onClick={() => actions.revokeEligible(user.id, user.name)}
          className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-1.5 text-orange-400/60 hover:border-orange-500 hover:text-orange-400 transition-all"
          title="Revoke eligibility">
          <ShieldOff size={13} />
        </button>
      )}
      {isTL ? (
        <button onClick={() => actions.demoteTL(user.id, user.name)}
          className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-1.5 text-orange-400/60 hover:border-orange-500 hover:text-orange-400 transition-all"
          title="Demote to Salesperson">
          <ShieldOff size={13} />
        </button>
      ) : (
        <button onClick={() => actions.promoteToTL(user.id, user.name)}
          className="rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-1.5 text-[#D4AF37]/60 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all"
          title="Promote to Team Leader">
          <Shield size={13} />
        </button>
      )}
      <SetGoalDialog userId={user.id} currentTarget={user.monthlyTarget} currentMonths={user.targetMonths || 3} onSuccess={actions.fetchData} />
      <button onClick={() => actions.setEditUser(user)}
        className="rounded-lg border border-white/10 bg-black/30 p-1.5 text-white/40 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all"
        title="Edit">
        <Edit size={13} />
      </button>
      <button onClick={() => actions.setResetPasswordUser(user)}
        className="rounded-lg border border-white/10 bg-black/30 p-1.5 text-white/40 hover:border-orange-500/30 hover:text-orange-400 transition-all"
        title="Reset Password">
        <KeyRound size={13} />
      </button>
      <button onClick={() => actions.toggleActive(user.id, user.isActive, user.name)}
        className={`rounded-lg border bg-black/30 p-1.5 transition-all ${
          user.isActive
            ? "border-white/10 text-red-400/60 hover:border-red-500/40 hover:text-red-400"
            : "border-white/10 text-emerald-400/60 hover:border-emerald-500/40 hover:text-emerald-400"
        }`}
        title={user.isActive ? "Deactivate" : "Activate"}>
        {user.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
      </button>
    </div>
  );
});

const OrgNodeCard = memo(function OrgNodeCard({
  user,
  depth,
  actions,
  members,
  collapsed,
  onToggle,
}: {
  user: UserWithTarget;
  depth: number;
  actions: Actions;
  members: UserWithTarget[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const target = user.currentMonthTarget ?? user.monthlyTarget ?? 50;
  const achieved = user.currentMonthAchieved || 0;
  const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  const isTL = user.role === "TEAM_LEAD";

  const teamLeads = useMemo(() => members.reduce((s, m) => s + (m.totalLeads ?? 0), 0), [members]);
  const teamJoined = useMemo(() => members.reduce((s, m) => s + (m.currentMonthAchieved || 0), 0), [members]);
  const teamTarget = useMemo(() => members.reduce((s, m) => s + (m.currentMonthTarget ?? m.monthlyTarget ?? 50), 0), [members]);
  const teamPct = teamTarget > 0 ? Math.min(100, Math.round((teamJoined / teamTarget) * 100)) : 0;

  return (
    <div className="relative">
      {depth > 0 && (
        <div className="absolute left-[15px] top-0 bottom-1/2 w-px bg-gradient-to-b from-[#D4AF37]/25 to-transparent" />
      )}

      <div className={`relative ${depth > 0 ? "ml-8" : ""}`}>
        {depth > 0 && (
          <div className="absolute left-[-17px] top-[28px] h-px w-4 bg-gradient-to-r from-[#D4AF37]/25 to-[#D4AF37]/8" />
        )}

        <div className={`relative rounded-2xl border transition-all duration-300 ${
          isTL
            ? "border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/[0.04] via-[#141210]/80 to-[#0a0a0a]/80 shadow-[0_4px_40px_-12px_rgba(212,175,55,0.12)]"
            : "border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-black/40 hover:border-white/[0.12]"
        }`}>

          {isTL && (
            <>
              <div className="px-4 py-4 sm:px-5 space-y-3 sm:space-y-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <button onClick={onToggle}
                      className={`relative flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                        collapsed
                          ? "bg-[#D4AF37]/10 text-[#D4AF37]/50"
                          : "bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 text-[#D4AF37] shadow-[0_0_30px_-4px_rgba(212,175,55,0.4)]"
                      }`}>
                      <Crown size={18} />
                      {!collapsed && (
                        <div className="absolute inset-0 rounded-2xl bg-[#D4AF37]/10 animate-pulse" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Link href={`/admin/salespersons/${user.id}`} className="block text-[15px] font-semibold text-white truncate hover:text-[#D4AF37] transition-colors cursor-pointer relative z-10">{user.name}</Link>
                        <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/[0.12] px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wider text-[#D4AF37] uppercase">
                          Team Lead
                        </span>
                        {pct >= 100 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                            <Award size={9} /> Achieved
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-white/35 flex items-center gap-1">
                          <BarChart3 size={10} /> {user.totalLeads ?? 0} leads
                        </span>
                        <span className="text-[11px] text-white/35 flex items-center gap-1">
                          <Users size={10} /> {members.length} member{members.length !== 1 ? "s" : ""}
                        </span>
                        {members.length > 0 && (
                          <div className="hidden sm:flex -space-x-1.5">
                            {members.slice(0, 5).map((m) => (
                              <div key={m.id} className="h-5.5 w-5.5 rounded-full border-[1.5px] border-[#141210] bg-gradient-to-br from-blue-500/50 to-blue-600/30 flex items-center justify-center shadow-sm">
                                <span className="text-[7px] text-blue-100 font-bold">{m.name?.charAt(0)?.toUpperCase()}</span>
                              </div>
                            ))}
                            {members.length > 5 && (
                              <div className="h-5.5 w-5.5 rounded-full border-[1.5px] border-[#141210] bg-white/10 flex items-center justify-center">
                                <span className="text-[7px] text-white/60 font-bold">+{members.length - 5}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                      <span className={`font-bold ${pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-[#D4AF37]" : "text-white/40"}`}>{achieved}</span>
                      <span className="text-white/20">/</span>
                      <span className="text-white/40">{target}</span>
                      <span className={`text-[10px] font-semibold ${pct >= 80 ? "text-emerald-400/70" : pct >= 50 ? "text-[#D4AF37]/70" : "text-white/30"}`}>({pct}%)</span>
                    </div>
                    <button onClick={onToggle}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-white/30 hover:bg-white/[0.08] hover:text-white/60 transition-all">
                      {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:hidden">
                  <ActionButtons user={user} actions={actions} />
                </div>
              </div>
              <div className="hidden sm:flex items-center justify-end gap-2 px-5 pb-2">
                <ActionButtons user={user} actions={actions} />
              </div>

              <div className="overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ maxHeight: !collapsed ? "2000px" : "0px", opacity: !collapsed ? 1 : 0 }}>
                <div className="border-t border-[#D4AF37]/[0.08] px-4 sm:px-5 py-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl bg-gradient-to-br from-blue-500/[0.06] to-blue-500/[0.02] border border-blue-500/10 px-3.5 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        <p className="text-[10px] text-blue-400/70 uppercase tracking-wider font-semibold">Leads</p>
                      </div>
                      <p className="text-xl font-bold text-blue-400">{user.totalLeads ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] px-3.5 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Target</p>
                      </div>
                      <p className="text-xl font-bold text-white">{target}</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-emerald-500/[0.06] to-emerald-500/[0.02] border border-emerald-500/10 px-3.5 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider font-semibold">Achieved</p>
                      </div>
                      <p className="text-xl font-bold text-emerald-400">{achieved}</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-[#D4AF37]/[0.06] to-[#D4AF37]/[0.02] border border-[#D4AF37]/10 px-3.5 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-[#D4AF37]" : "bg-red-400"}`} />
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Progress</p>
                      </div>
                      <div className="flex items-end gap-2">
                        <p className="text-xl font-bold text-white">{pct}%</p>
                        <div className="flex-1 mb-1.5">
                          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${
                              pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-[#D4AF37]" : pct >= 25 ? "bg-orange-500" : "bg-red-500"
                            }`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {members.length > 0 && (
                    <div className="flex items-center gap-4 rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                        <TrendingUp size={11} className="text-[#D4AF37]/50" />
                        <span>Team: <span className="text-white/60 font-semibold">{teamLeads}</span> leads</span>
                      </div>
                      <div className="h-3 w-px bg-white/[0.06]" />
                      <div className="text-[11px] text-white/30">
                        <span className="text-emerald-400/70 font-semibold">{teamJoined}</span>/<span className="text-white/50">{teamTarget}</span> joined
                      </div>
                      <div className="h-3 w-px bg-white/[0.06]" />
                      <div className="text-[11px] text-white/30">
                        Team: <span className={`font-semibold ${teamPct >= 80 ? "text-emerald-400" : teamPct >= 50 ? "text-[#D4AF37]" : "text-white/50"}`}>{teamPct}%</span>
                      </div>
                    </div>
                  )}

                  {user.ledTeam && (
                    <p className="text-[11px] text-[#D4AF37]/40 font-medium">Team: {user.ledTeam.name}</p>
                  )}

                  {members.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Team Members</p>
                      <div className="rounded-xl border border-white/[0.04] bg-black/20 overflow-hidden divide-y divide-white/[0.04]">
                        {members.map((member) => {
                          const mTarget = member.currentMonthTarget ?? member.monthlyTarget ?? 50;
                          const mAchieved = member.currentMonthAchieved || 0;
                          const mPct = mTarget > 0 ? Math.min(100, Math.round((mAchieved / mTarget) * 100)) : 0;
                          return (
                            <div key={member.id} className="px-3 py-3 sm:px-4 sm:py-3 hover:bg-white/[0.02] transition-colors space-y-2 sm:space-y-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/10">
                                    <User size={13} />
                                  </div>
                                  <div className="min-w-0">
                                    <Link href={`/admin/salespersons/${member.id}`} className="block text-sm font-medium text-white truncate hover:text-[#D4AF37] transition-colors cursor-pointer relative z-10">{member.name}</Link>
                                    <p className="text-[10px] sm:text-[11px] text-white/30 truncate">{member.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-blue-400/60">{member.totalLeads ?? 0} leads</span>
                                  {mPct >= 100 && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400">
                                      <Award size={7} /> Done
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pl-[42px] flex-wrap">
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <p className="text-[11px] text-white/50">
                                      <span className="text-white font-semibold">{mAchieved}</span>
                                      <span className="text-white/25">/{mTarget}</span>
                                    </p>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-white/[0.06] w-14 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${
                                      mPct >= 80 ? "bg-emerald-500" : mPct >= 50 ? "bg-[#D4AF37]" : mPct >= 25 ? "bg-orange-500" : "bg-red-500"
                                    }`} style={{ width: `${mPct}%` }} />
                                  </div>
                                  <span className="text-[9px] text-white/30 w-7 text-right">{mPct}%</span>
                                </div>
                                <select
                                  value={member.teamLeaderId || ""}
                                  onChange={(e) => {
                                    if (e.target.value === "") {
                                      if (!confirm(`Unassign ${member.name} from this team?`)) return;
                                    }
                                    actions.assignToTeam(member.id, e.target.value);
                                  }}
                                  className="cursor-pointer rounded-lg border border-white/10 bg-black/40 px-1.5 py-1 text-[9px] sm:text-[10px] text-white/60 outline-none max-w-[100px] hover:border-white/20 transition-colors"
                                  title="Move to team"
                                >
                                  <option value="">Unassign</option>
                                  {actions.teamLeaders.filter((tl) => tl.id !== user.id).map((tl) => (
                                    <option key={tl.id} value={tl.id} className="bg-[#111]">{tl.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    if (!confirm(`Unassign ${member.name} from this team?`)) return;
                                    actions.assignToTeam(member.id, "");
                                  }}
                                  className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-1 sm:p-1.5 text-orange-400/60 hover:border-orange-500 hover:text-orange-400 transition-all"
                                  title="Unassign from team"
                                >
                                  <UserMinus size={12} />
                                </button>
                                <div className="hidden sm:flex items-center gap-1">
                                  <ActionButtons user={member} actions={actions} />
                                </div>
                              </div>
                              <div className="flex sm:hidden items-center gap-1 pl-[42px]">
                                <ActionButtons user={member} actions={actions} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!isTL && (
            <div className="px-4 py-3 space-y-2 sm:space-y-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/10">
                    <User size={14} />
                  </div>
                  <div className="min-w-0">
                    <Link href={`/admin/salespersons/${user.id}`} className="block text-sm font-medium text-white truncate hover:text-[#D4AF37] transition-colors cursor-pointer relative z-10">{user.name}</Link>
                    <p className="text-[11px] text-white/30 truncate">{user.email}</p>
                  </div>
                </div>
                <span className="text-[10px] text-blue-400/60 shrink-0">{user.totalLeads ?? 0} leads</span>
              </div>
              <div className="flex items-center gap-3 pl-[48px]">
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs text-white/50">
                      <span className="text-white font-semibold">{achieved}</span>
                      <span className="text-white/25">/{target}</span>
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] w-16 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-[#D4AF37]" : pct >= 25 ? "bg-orange-500" : "bg-red-500"
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] text-white/30 w-7 text-right">{pct}%</span>
                </div>
                <ActionButtons user={user} actions={actions} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default function SalespersonTable() {
  const [data, setData] = useState<UserWithTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserWithTarget | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithTarget | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const limit = 5;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/targets?month=${month}&year=${year}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.error("Failed to load sales team.");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const teamLeaders = useMemo(() => data.filter((u) => u.role === "TEAM_LEAD"), [data]);
  const unassigned = useMemo(
    () => data.filter((u) => u.role === "SALESPERSON" && !u.teamLeaderId),
    [data],
  );

  const totalPages = useMemo(() => Math.max(1, Math.ceil(teamLeaders.length / limit)), [teamLeaders.length]);
  const pagedTeamLeaders = useMemo(() => teamLeaders.slice((page - 1) * limit, page * limit), [teamLeaders, page, limit]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const teamMembersMap = useMemo(() => {
    const map = new Map<string, UserWithTarget[]>();
    for (const u of data) {
      if (u.role === "SALESPERSON" && u.teamLeaderId) {
        const arr = map.get(u.teamLeaderId);
        if (arr) arr.push(u);
        else map.set(u.teamLeaderId, [u]);
      }
    }
    return map;
  }, [data]);

  const toggleTeam = useCallback((tlId: string) => {
    setCollapsedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(tlId)) next.delete(tlId);
      else next.add(tlId);
      return next;
    });
  }, []);

  const assignToTeam = useCallback(async (userId: string, teamLeaderId: string) => {
    try {
      const r = await fetch("/api/admin/team/assign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, teamLeaderId: teamLeaderId || null }),
      });
      const j = await r.json();
      if (j.success) { toast.success("Team updated."); fetchData(); }
      else toast.error(j.message);
    } catch { toast.error("Failed to update team."); }
  }, [fetchData]);

  const promoteToTL = useCallback(async (userId: string, name: string) => {
    try {
      const r = await fetch(`/api/admin/users/promote/${userId}`, { method: "POST" });
      const j = await r.json();
      if (j.success) { toast.success(`${name} promoted to Team Leader`); fetchData(); }
      else toast.error(j.message);
    } catch { toast.error("Failed to promote."); }
  }, [fetchData]);

  const demoteTL = useCallback(async (userId: string, name: string) => {
    if (!confirm(`Demote ${name} back to Salesperson? Their team members will be unassigned.`)) return;
    try {
      const r = await fetch(`/api/admin/users/demote/${userId}`, { method: "POST" });
      const j = await r.json();
      if (j.success) { toast.success(`${name} demoted to Salesperson`); fetchData(); }
      else toast.error(j.message);
    } catch { toast.error("Failed to demote."); }
  }, [fetchData]);

  const toggleActive = useCallback(async (userId: string, _currentActive: boolean, name: string) => {
    try {
      const r = await fetch(`/api/admin/salespersons/${userId}/toggle-active`, { method: "POST" });
      const j = await r.json();
      if (j.success) {
        toast.success(`${name} ${j.isActive ? "activated" : "deactivated"}`);
        fetchData();
      } else toast.error(j.message || "Failed.");
    } catch { toast.error("Failed to toggle status."); }
  }, [fetchData]);

  const markEligible = useCallback(async (userId: string, name: string) => {
    try {
      const r = await fetch(`/api/admin/users/mark-eligible/${userId}`, { method: "POST" });
      const j = await r.json();
      if (j.success) { toast.success(j.message); fetchData(); }
      else toast.error(j.message);
    } catch { toast.error("Failed to mark eligible."); }
  }, [fetchData]);

  const revokeEligible = useCallback(async (userId: string, name: string) => {
    try {
      const r = await fetch(`/api/admin/users/revoke-eligible/${userId}`, { method: "POST" });
      const j = await r.json();
      if (j.success) { toast.success(j.message); fetchData(); }
      else toast.error(j.message);
    } catch { toast.error("Failed to revoke eligibility."); }
  }, [fetchData]);

  const setEditUserCb = useCallback((u: UserWithTarget) => setEditUser(u), []);
  const setResetPasswordUserCb = useCallback((u: UserWithTarget) => setResetPasswordUser(u), []);

  const actions: Actions = useMemo(
    () => ({
      fetchData, month, year, assignToTeam, promoteToTL, demoteTL, toggleActive,
      markEligible, revokeEligible,
      setEditUser: setEditUserCb, setResetPasswordUser: setResetPasswordUserCb, teamLeaders,
    }),
    [fetchData, month, year, assignToTeam, promoteToTL, demoteTL, toggleActive, markEligible, revokeEligible, setEditUserCb, setResetPasswordUserCb, teamLeaders],
  );

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(totalPages, p)));
    setCollapsedTeams(new Set());
  }, [totalPages]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-5 sm:p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10">
            <Users size={20} className="text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Organization Tree</h2>
            <p className="text-xs text-white/40">{data.length} members · {teamLeaders.length} teams</p>
          </div>
        </div>
        <AddSalespersonDialog onSuccess={fetchData} />
      </div>

      <div className="rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-5 sm:p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
        <div className="space-y-5">
          {pagedTeamLeaders.map((tl) => (
            <OrgNodeCard
              key={tl.id}
              user={tl}
              depth={0}
              actions={actions}
              members={teamMembersMap.get(tl.id) || []}
              collapsed={collapsedTeams.has(tl.id)}
              onToggle={() => toggleTeam(tl.id)}
            />
          ))}
        </div>

        {unassigned.length > 0 && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5">
                <User size={12} className="text-white/40" />
              </div>
              <h3 className="text-sm font-medium text-white/50">Unassigned Salespersons</h3>
              <span className="text-xs text-white/30">({unassigned.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unassigned.map((sp) => {
                const target = sp.currentMonthTarget ?? sp.monthlyTarget ?? 50;
                const achieved = sp.currentMonthAchieved || 0;
                const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;

                return (
                  <div key={sp.id}
                    className={`rounded-xl border transition-all duration-200 ${
                      sp.isActive
                        ? "border-white/[0.08] bg-black/40 hover:border-white/20"
                        : "border-red-500/10 bg-black/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                          <User size={13} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/admin/salespersons/${sp.id}`} className="block text-sm font-medium text-white truncate hover:text-[#D4AF37] transition-colors cursor-pointer relative z-10">{sp.name}</Link>
                            <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${
                              sp.isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}>
                              {sp.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/40 truncate">{sp.email}</p>
                          <p className="text-[10px] text-blue-400/50 mt-0.5">{sp.totalLeads ?? 0} leads</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                        Salesperson
                      </span>
                    </div>

                    <div className="px-3 pb-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] text-white/40">Target</span>
                            <span className="text-[10px] text-white/60">{achieved}/{target}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className={`h-full rounded-full ${
                              pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-[#D4AF37]" : pct >= 25 ? "bg-orange-500" : "bg-red-500"
                            }`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-[10px] text-white/40 w-8 text-right">{pct}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-white/5 px-3 py-2">
                      <select value={sp.teamLeaderId || ""} onChange={(e) => assignToTeam(sp.id, e.target.value)}
                        className="cursor-pointer rounded border border-white/10 bg-black/40 px-1.5 py-1 text-[10px] text-white/70 outline-none max-w-[130px]">
                        <option value="">No Team</option>
                        {teamLeaders.map((tl) => (
                          <option key={tl.id} value={tl.id} className="bg-[#111]">{tl.name}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1">
                        {sp.eligibleForTeamLeader && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-1 text-[9px] font-semibold text-emerald-400">
                            <Star size={9} fill="currentColor" /> Eligible
                          </span>
                        )}
                        <button onClick={() => promoteToTL(sp.id, sp.name)}
                          className="rounded-md border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-1 text-[#D4AF37]/60 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all" title="Promote to Team Leader">
                          <Shield size={11} />
                        </button>
                        <SetGoalDialog userId={sp.id} currentTarget={sp.monthlyTarget} currentMonths={sp.targetMonths || 3} onSuccess={fetchData} />
                        <button onClick={() => setEditUserCb(sp)}
                          className="rounded-md border border-white/10 bg-black/30 p-1 text-white/40 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all" title="Edit">
                          <Edit size={11} />
                        </button>
                        <button onClick={() => setResetPasswordUserCb(sp)}
                          className="rounded-md border border-white/10 bg-black/30 p-1 text-white/40 hover:border-orange-500/30 hover:text-orange-400 transition-all" title="Reset Password">
                          <KeyRound size={11} />
                        </button>
                        <button onClick={() => toggleActive(sp.id, sp.isActive, sp.name)}
                          className={`rounded-md border bg-black/30 p-1 transition-all ${
                            sp.isActive
                              ? "border-white/10 text-red-400/60 hover:border-red-500/40 hover:text-red-400"
                              : "border-white/10 text-emerald-400/60 hover:border-emerald-500/40 hover:text-emerald-400"
                          }`}
                          title={sp.isActive ? "Deactivate" : "Activate"}>
                          {sp.isActive ? <UserX size={11} /> : <UserCheck size={11} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.length === 0 && (
          <div className="py-16 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                <Plus size={28} className="text-white/20" />
              </div>
            </div>
            <p className="text-white/40 text-sm">No team members yet</p>
            <p className="text-white/20 text-xs mt-1">Add your first salesperson to get started</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-white/30">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => goToPage(1)}
                  disabled={page === 1}
                  className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[11px] text-white/50 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[11px] text-white/50 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] transition-all ${
                        page === pageNum
                          ? "border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37] font-semibold"
                          : "border-white/10 bg-black/30 text-white/50 hover:border-[#D4AF37]/30 hover:text-[#D4AF37]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[11px] text-white/50 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={page === totalPages}
                  className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[11px] text-white/50 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {editUser && (
        <EditSalespersonDialog
          user={editUser}
          onSuccess={fetchData}
          open={!!editUser}
          setOpen={() => setEditUser(null)}
        />
      )}
      {resetPasswordUser && (
        <ResetSalespersonPasswordDialog
          user={resetPasswordUser}
          open={!!resetPasswordUser}
          setOpen={() => setResetPasswordUser(null)}
        />
      )}
    </div>
  );
}
