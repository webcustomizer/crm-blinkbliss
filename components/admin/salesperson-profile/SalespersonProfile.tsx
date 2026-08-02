"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, User, Mail, Phone, Shield, Calendar, MapPin,
  TrendingUp, Target, Users, UserCheck, UserX, Clock,
  MessageSquare, Activity, LogIn, LogOut, ChevronRight,
  BarChart3, Award, RefreshCw, Eye, AlertTriangle, CheckCircle2,
  CircleDot, Zap, Star, Crown,
} from "lucide-react";

type ProfileData = {
  user: {
    id: string; name: string; email: string; phone: string | null;
    role: string; isActive: boolean; createdAt: string;
    responseTimeAvg: number; monthlyTarget: number; targetMonths: number;
    eligibleForTeamLeader: boolean; eligibleSince: string | null;
    twoFactorEnabled: boolean; teamLeaderId: string | null;
    teamLeader: { id: string; name: string } | null;
    ledTeam: { id: string; name: string } | null;
    _count: { teamMembers: number; leads: number };
  };
  stats: {
    totalLeads: number; activeLeads: number; joinedCount: number;
    deadCount: number; conversionRate: number; followupCount: number;
    responseTimeAvg: number;
    statusCounts: Record<string, number>;
  };
  followups: {
    overdue: Array<{
      id: string; remarks: string; followUpNumber: number;
      nextFollowUp: string; createdAt: string;
      lead: { id: string; name: string; phone: string; status: string };
    }>;
    upcoming: Array<{
      id: string; remarks: string; followUpNumber: number;
      nextFollowUp: string; createdAt: string;
      lead: { id: string; name: string; phone: string; status: string };
    }>;
  };
  recentActivities: Array<{
    id: string; action: string; description: string; createdAt: string;
    lead: { id: string; name: string } | null;
  }>;
  loginSessions: Array<{
    id: string; deviceName: string | null; deviceType: string | null;
    browser: string | null; os: string | null; ipAddress: string | null;
    isExpired: boolean; lastActiveAt: string; createdAt: string;
  }>;
  messageStats: { sent: number; received: number; unread: number };
  targetHistory: Array<{
    id: string; month: number; year: number; target: number;
    joined: number; createdAt: string;
  }>;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: "New", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  CALLED: { label: "Called", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  NEED_MORE_FOLLOW_UP: { label: "Follow Up", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  TRAINING_ATTENDED: { label: "Training", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  SEAT_RESERVED: { label: "Reserved", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  JOINED: { label: "Joined", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  DEAD: { label: "Dead", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

const ACTION_ICONS: Record<string, typeof User> = {
  LOGIN: LogIn, LOGOUT: LogOut, LEAD_UPDATED: Eye, STATUS_CHANGED: RefreshCw,
  FOLLOWUP_COMPLETED: CheckCircle2, PASSWORD_CHANGED: Shield,
  LEAD_SOFT_DELETED: UserX, LEAD_RESTORED: RefreshCw,
  MESSAGE_SENT: MessageSquare, LEAD_BULK_ACTION: Users,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function SalespersonProfile({ userId }: { userId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/salespersons/${userId}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) setData(json.data);
      else toast.error("Failed to load profile.");
    } catch { toast.error("Failed to load profile."); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-white/40">Profile not found.</div>;

  const { user, stats, followups, recentActivities, loginSessions, messageStats, targetHistory } = data;
  const activeSession = loginSessions.find((s) => !s.isExpired);

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#080808]/90 backdrop-blur-xl">
        <div className="flex items-center gap-4 px-6 py-4">
          <button onClick={() => router.back()} className="rounded-xl border border-white/10 p-2 hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} className="text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Salesperson Profile</h1>
            <p className="text-xs text-white/40">Detailed overview and performance metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
              user.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-400" : "bg-red-400"}`} />
              {user.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Profile Header Card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent">
          <div className="relative h-24 bg-gradient-to-r from-[#D4AF37]/20 via-[#D4AF37]/5 to-transparent" />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-5 -mt-10">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#080808] bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/10 text-2xl font-bold text-[#D4AF37] shadow-xl">
                {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{user.name}</h2>
                  {user.role === "TEAM_LEAD" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-semibold text-[#D4AF37] border border-[#D4AF37]/20">
                      <Crown size={10} /> Team Lead
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/40">{user.email}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1.5"><Phone size={12} /> {user.phone || "No phone"}</span>
              <span className="flex items-center gap-1.5"><Calendar size={12} /> Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              {user.teamLeader && <span className="flex items-center gap-1.5"><Users size={12} /> Reports to {user.teamLeader.name}</span>}
              {user.ledTeam && <span className="flex items-center gap-1.5"><Award size={12} /> Leads {user.ledTeam.name}</span>}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Target} label="Total Leads" value={stats.totalLeads} color="text-blue-400" />
          <StatCard icon={UserCheck} label="Joined" value={stats.joinedCount} color="text-emerald-400" />
          <StatCard icon={TrendingUp} label="Conversion" value={`${stats.conversionRate}%`} color="text-[#D4AF37]" />
          <StatCard icon={Clock} label="Avg Response" value={formatResponseTime(stats.responseTimeAvg)} color="text-purple-400" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Lead Pipeline */}
            <Card title="Lead Pipeline" icon={BarChart3}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} className={`rounded-xl border p-3 ${cfg.bg}`}>
                    <p className={`text-[11px] font-medium ${cfg.color}`}>{cfg.label}</p>
                    <p className="mt-1 text-xl font-bold text-white">{stats.statusCounts[key] || 0}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Target History */}
            <Card title="Target History" icon={Target}>
              {targetHistory.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-4">No targets set yet.</p>
              ) : (
                <div className="space-y-3">
                  {targetHistory.map((t) => {
                    const pct = t.target > 0 ? Math.min(100, Math.round((t.joined / t.target) * 100)) : 0;
                    return (
                      <div key={t.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">{MONTHS[t.month - 1]} {t.year}</span>
                          <span className="text-white/40">{t.joined}/{t.target}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-right text-[10px] text-white/30">{pct}% achieved</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Recent Activity */}
            <Card title="Recent Activity" icon={Activity}>
              {recentActivities.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-4">No recent activity.</p>
              ) : (
                <div className="space-y-1">
                  {recentActivities.map((a) => {
                    const Icon = ACTION_ICONS[a.action] || CircleDot;
                    return (
                      <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03] transition-colors">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                          <Icon size={13} className="text-white/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/70 truncate">{a.description}</p>
                          {a.lead && <p className="text-[10px] text-white/30">{a.lead.name}</p>}
                        </div>
                        <span className="text-[10px] text-white/25 shrink-0">{formatRelative(a.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Follow-ups */}
            <Card title="Overdue Follow-ups" icon={AlertTriangle}>
              {followups.overdue.length === 0 ? (
                <p className="text-sm text-emerald-400/70 text-center py-4">All caught up!</p>
              ) : (
                <div className="space-y-2">
                  {followups.overdue.map((f) => (
                    <FollowUpItem key={f.id} followup={f} overdue />
                  ))}
                </div>
              )}
            </Card>

            <Card title="Upcoming Follow-ups" icon={Clock}>
              {followups.upcoming.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-4">No upcoming follow-ups.</p>
              ) : (
                <div className="space-y-2">
                  {followups.upcoming.map((f) => (
                    <FollowUpItem key={f.id} followup={f} />
                  ))}
                </div>
              )}
            </Card>

            {/* Messages */}
            <Card title="Messages" icon={MessageSquare}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-lg font-bold text-white">{messageStats.sent}</p>
                  <p className="text-[10px] text-white/40">Sent</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-lg font-bold text-white">{messageStats.received}</p>
                  <p className="text-[10px] text-white/40">Received</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-lg font-bold text-white">{messageStats.unread}</p>
                  <p className="text-[10px] text-white/40">Unread</p>
                </div>
              </div>
            </Card>

            {/* Sessions */}
            <Card title="Login Sessions" icon={LogIn}>
              {loginSessions.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-4">No sessions.</p>
              ) : (
                <div className="space-y-2">
                  {loginSessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        !s.isExpired ? "bg-emerald-500/10" : "bg-white/[0.04]"
                      }`}>
                        <LogIn size={12} className={!s.isExpired ? "text-emerald-400" : "text-white/30"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-white/70 truncate">{s.deviceName || s.browser || "Unknown device"}</p>
                        <p className="text-[10px] text-white/30">{s.os} · {s.ipAddress || "No IP"}</p>
                      </div>
                      <span className={`text-[10px] ${!s.isExpired ? "text-emerald-400" : "text-white/25"}`}>
                        {!s.isExpired ? "Active" : formatRelative(s.lastActiveAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <Icon size={14} className="text-[#D4AF37]/70" />
        <h3 className="text-sm font-semibold text-white/80">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof User; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04]`}>
          <Icon size={15} className={color} />
        </div>
        <div>
          <p className="text-[11px] text-white/40">{label}</p>
          <p className="text-lg font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function FollowUpItem({ followup, overdue }: { followup: { id: string; remarks: string; followUpNumber: number; nextFollowUp: string; lead: { id: string; name: string; phone: string } }; overdue?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 ${overdue ? "border-red-500/20 bg-red-500/5" : "border-white/[0.06] bg-white/[0.02]"}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/80">{followup.lead.name}</p>
        <span className={`text-[10px] font-medium ${overdue ? "text-red-400" : "text-white/40"}`}>
          #{followup.followUpNumber}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-white/30">{followup.lead.phone}</p>
      {followup.nextFollowUp && (
        <p className={`mt-1 text-[10px] ${overdue ? "text-red-400/70" : "text-white/30"}`}>
          {overdue ? "Due " : "Due "}{new Date(followup.nextFollowUp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      )}
    </div>
  );
}

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatResponseTime(ms: number) {
  if (!ms || ms <= 0) return "N/A";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m ${totalSec % 60}s`;
  const days = Math.floor(totalMin / 1440);
  const hrs = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hrs}h ${mins}m`;
  return `${hrs}h ${mins}m`;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#080808] animate-pulse">
      <div className="h-16 border-b border-white/[0.06] bg-[#080808]" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        <div className="h-40 rounded-2xl bg-white/[0.03]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-2xl bg-white/[0.03]" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="h-48 rounded-2xl bg-white/[0.03]" />
            <div className="h-64 rounded-2xl bg-white/[0.03]" />
          </div>
          <div className="space-y-6">
            <div className="h-32 rounded-2xl bg-white/[0.03]" />
            <div className="h-32 rounded-2xl bg-white/[0.03]" />
            <div className="h-40 rounded-2xl bg-white/[0.03]" />
          </div>
        </div>
      </div>
    </div>
  );
}
