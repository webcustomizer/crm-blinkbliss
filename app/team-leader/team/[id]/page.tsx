"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, Calendar, Clock, Target,
  UserCheck, UserX, Activity, PhoneCall, Briefcase,
  Loader2, Star, ChevronRight,
} from "lucide-react";
import { formatDateShort, formatDateTime } from "@/lib/format-date";

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  NEW: { label: "New", color: "text-blue-400", bg: "bg-blue-500/15", dot: "bg-blue-400" },
  CALLED: { label: "Called", color: "text-yellow-400", bg: "bg-yellow-500/15", dot: "bg-yellow-400" },
  TRAINING_ATTENDED: { label: "Training", color: "text-purple-400", bg: "bg-purple-500/15", dot: "bg-purple-400" },
  SEAT_RESERVED: { label: "Reserved", color: "text-cyan-400", bg: "bg-cyan-500/15", dot: "bg-cyan-400" },
  NEED_MORE_FOLLOW_UP: { label: "Follow Up", color: "text-orange-400", bg: "bg-orange-500/15", dot: "bg-orange-400" },
  JOINED: { label: "Joined", color: "text-emerald-400", bg: "bg-emerald-500/15", dot: "bg-emerald-400" },
  DEAD: { label: "Dead", color: "text-red-400", bg: "bg-red-500/15", dot: "bg-red-400" },
};

interface MemberData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  monthlyTarget: number;
  createdAt: string;
  _count: { leads: number };
  statusCounts: { status: string; _count: number }[];
  recentLeads: {
    id: string; name: string | null; phone: string; status: string;
    followUpCount: number; createdAt: string; isPriority: boolean;
  }[];
  totalFollowups: number;
  joinedCount: number;
  deadCount: number;
  lastFollowUpAt: string | null;
}

export default function TeamMemberDetailPage() {
  const params = useParams();
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/team-leader/team/${params.id}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setMember(j.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
        <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-36 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="h-3 w-28 animate-pulse rounded-lg bg-white/[0.04]" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 flex-1 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-4">
          <div className="h-3 w-28 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="mt-3 h-2.5 w-full animate-pulse rounded-full bg-white/[0.04]" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-4">
          <div className="h-3 w-32 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="mt-3 space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 animate-pulse rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!member) return <p className="text-zinc-500 text-sm py-10 text-center">Member not found.</p>;

  const statusMap: Record<string, number> = {};
  for (const s of member.statusCounts) statusMap[s.status] = s._count;
  const totalStatuses = member.statusCounts.reduce((a, s) => a + s._count, 0);
  const targetPct = member.monthlyTarget > 0 ? Math.min(100, Math.round((member.joinedCount / member.monthlyTarget) * 100)) : 0;

  return (
    <div className="space-y-4">
      <Link href="/team-leader/team" className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-[#D4AF37] transition-colors">
        <ArrowLeft size={14} /> Back to Team
      </Link>

      {/* Profile Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-5">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-bold text-lg ${
            member.isActive ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "bg-white/5 text-white/20"
          }`}>
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white truncate">{member.name}</h1>
              <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                member.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"
              }`}>{member.isActive ? "Active" : "Inactive"}</span>
            </div>
            {member.phone && (
              <div className="flex items-center gap-1 mt-1 text-[11px] text-white/30">
                <Phone size={10} />{member.phone}
              </div>
            )}
          </div>
        </div>

        {/* Contact actions */}
        <div className="flex gap-2 mt-4">
          {member.phone && (
            <a href={`tel:${member.phone}`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] py-2.5 text-xs text-emerald-400 transition-colors">
              <Phone size={13} /> Call
            </a>
          )}
          <a href={`mailto:${member.email}`}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] py-2.5 text-xs text-blue-400 transition-colors">
            <Mail size={13} /> Email
          </a>
          <Link href={`/team-leader/team-leads?memberId=${member.id}`}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] py-2.5 text-xs text-[#D4AF37] transition-colors">
            <Briefcase size={13} /> Leads
          </Link>
        </div>
      </div>

      {/* Target */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-white/25 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Target size={11} /> Monthly Target
          </span>
          <span className="text-sm font-bold text-white">{targetPct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all duration-700 ${
            targetPct >= 100 ? "bg-emerald-400" : targetPct >= 50 ? "bg-[#D4AF37]" : "bg-white/20"
          }`} style={{ width: `${targetPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/30">{member.joinedCount} joined</span>
          <span className="text-white/30">Target: {member.monthlyTarget}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total Leads", value: totalStatuses, accent: "text-white" },
          { label: "Joined", value: member.joinedCount, accent: "text-emerald-400" },
          { label: "Dead", value: member.deadCount, accent: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-[#161616] p-3 text-center">
            <p className={`text-xl font-bold ${s.accent}`}>{s.value}</p>
            <p className="text-[10px] text-white/25 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Status Breakdown */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-4">
        <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Status Breakdown</h3>
        {totalStatuses === 0 ? (
          <p className="text-[11px] text-white/20">No leads yet.</p>
        ) : (
          <div className="space-y-2.5">
            {member.statusCounts
              .filter((s) => s._count > 0)
              .sort((a, b) => b._count - a._count)
              .map((s) => {
                const meta = STATUS_META[s.status];
                if (!meta) return null;
                const pct = totalStatuses > 0 ? Math.round((s._count / totalStatuses) * 100) : 0;
                return (
                  <div key={s.status} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                        <span className={`text-[11px] ${meta.color}`}>{meta.label}</span>
                      </div>
                      <span className="text-[11px] text-white/30">{s._count} <span className="text-white/15">({pct}%)</span></span>
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
      <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-4">
        <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/30 flex items-center gap-1.5"><PhoneCall size={10} />Total Follow-ups</span>
            <span className="text-[11px] text-white/50 font-medium">{member.totalFollowups}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/30 flex items-center gap-1.5"><Clock size={10} />Last Follow-up</span>
            <span className="text-[11px] text-white/50">{member.lastFollowUpAt ? formatDateTime(member.lastFollowUpAt) : "Never"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/30 flex items-center gap-1.5"><Calendar size={10} />Member Since</span>
            <span className="text-[11px] text-white/50">{formatDateShort(member.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Recent Leads */}
      {member.recentLeads.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Recent Leads</h3>
            <Link href={`/team-leader/team-leads?memberId=${member.id}`}
              className="text-[10px] text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors flex items-center gap-1">
              View all <ChevronRight size={10} />
            </Link>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {member.recentLeads.map((lead) => {
              const meta = STATUS_META[lead.status];
              return (
                <div key={lead.id} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {lead.isPriority && <Star size={10} className="shrink-0 text-[#D4AF37]" fill="currentColor" />}
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-white truncate">{lead.name || "Unknown"}</p>
                      <p className="text-[10px] text-white/20">{lead.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {meta && (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${meta.bg} border-white/[0.04] ${meta.color}`}>
                        {meta.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
