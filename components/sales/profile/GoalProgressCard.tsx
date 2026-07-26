"use client";

import { useEffect, useState } from "react";
import { Target, Star, TrendingUp, Trophy } from "lucide-react";

interface GoalData {
  monthlyTarget: number;
  targetMonths: number;
  totalGoal: number;
  monthlyJoinedLeads: number;
  evaluationJoinedLeads: number;
  totalJoinedLeads: number;
  eligibleForTeamLeader: boolean;
  eligibleSince: string | null;
}

export default function GoalProgressCard() {
  const [data, setData] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/salesperson/goal-progress")
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-5 space-y-4">
        <div className="h-5 w-32 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-white/[0.04]" />
        <div className="h-3 w-48 animate-pulse rounded-lg bg-white/[0.04]" />
      </div>
    );
  }

  if (!data) return null;

  const progress = data.totalGoal > 0 ? Math.min(100, Math.round((data.evaluationJoinedLeads / data.totalGoal) * 100)) : 0;
  const remaining = Math.max(0, data.totalGoal - data.evaluationJoinedLeads);
  const isEligible = data.eligibleForTeamLeader;
  const isAchieved = data.evaluationJoinedLeads >= data.totalGoal;

  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Target size={16} className="text-[#D4AF37]" />
          Team Leader Goal
        </h2>
        {isEligible && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
            <Star size={10} fill="currentColor" /> Eligible
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/30 border border-white/[0.04] px-3 py-2.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Target / Month</p>
          <p className="mt-1 text-lg font-bold text-white">{data.monthlyTarget} <span className="text-xs text-white/30 font-normal">joined</span></p>
        </div>
        <div className="rounded-xl bg-black/30 border border-white/[0.04] px-3 py-2.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Evaluation Period</p>
          <p className="mt-1 text-lg font-bold text-white">{data.targetMonths} <span className="text-xs text-white/30 font-normal">{data.targetMonths === 1 ? "month" : "months"}</span></p>
        </div>
      </div>

      <div className="rounded-xl bg-black/30 border border-white/[0.04] px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">This Month</p>
          <p className="text-xs font-semibold text-[#D4AF37]">{data.monthlyJoinedLeads}/{data.monthlyTarget}</p>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${
            data.monthlyJoinedLeads >= data.monthlyTarget ? "bg-emerald-500" : "bg-[#D4AF37]"
          }`} style={{ width: `${Math.min(100, data.monthlyTarget > 0 ? (data.monthlyJoinedLeads / data.monthlyTarget) * 100 : 0)}%` }} />
        </div>
      </div>

      <div className="rounded-xl bg-[#D4AF37]/[0.04] border border-[#D4AF37]/15 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/50">
            <span className="font-semibold text-[#D4AF37]">{data.evaluationJoinedLeads}</span> / {data.totalGoal} joined ({data.targetMonths}-month eval)
          </span>
          <span className={`text-xs font-bold ${isAchieved ? "text-emerald-400" : "text-white/40"}`}>{progress}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${
            isAchieved ? "bg-emerald-500" : progress >= 50 ? "bg-[#D4AF37]" : progress >= 25 ? "bg-orange-500" : "bg-red-500"
          }`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={`rounded-xl border px-3 py-2.5 flex items-start gap-2.5 ${
        isEligible
          ? "bg-emerald-500/[0.06] border-emerald-500/20"
          : isAchieved
            ? "bg-blue-500/[0.06] border-blue-500/20"
            : "bg-white/[0.02] border-white/[0.06]"
      }`}>
        {isEligible ? (
          <>
            <Trophy size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-emerald-400">You&apos;re eligible for Team Leader!</p>
              <p className="text-[10px] text-emerald-400/60 mt-0.5">Talk to your admin to get promoted.</p>
              {data.eligibleSince && (
                <p className="text-[10px] text-white/20 mt-0.5">Since {new Date(data.eligibleSince).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" })}</p>
              )}
            </div>
          </>
        ) : isAchieved ? (
          <>
            <Star size={16} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-blue-400">Goal achieved! Waiting for admin approval.</p>
              <p className="text-[10px] text-blue-400/50 mt-0.5">You&apos;ve hit your target. The admin will mark you eligible soon.</p>
            </div>
          </>
        ) : (
          <>
            <TrendingUp size={16} className="text-white/30 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-white/50">
                <span className="font-semibold text-white">{remaining} more</span> joined {remaining === 1 ? "lead" : "leads"} needed to reach your goal
              </p>
              <p className="text-[10px] text-white/20 mt-0.5">Keep following up and converting leads!</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
