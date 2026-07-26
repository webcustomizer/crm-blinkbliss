"use client";

import { CalendarDays, ShieldCheck, UserRound, Users, UserCog, UserRoundCheck, Clock } from "lucide-react";

interface AdminProfileHeaderProps {
  profile: {
    name: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    lastLoginAt: string | null;
  };
  stats: {
    totalLeads: number;
    totalSalespersons: number;
    totalCustomers: number;
  };
}

export default function AdminProfileHeader({ profile, stats }: AdminProfileHeaderProps) {
  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/20 bg-[#111111] shadow-xl">
      {/* Top gradient banner */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-[#D4AF37]/20 via-[#D4AF37]/5 to-transparent" />
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#D4AF37]/5 blur-3xl" />
      <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#D4AF37]/5 blur-3xl" />

      <div className="relative p-6 sm:p-8">
        {/* Top section: Avatar + Info */}
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          {/* Avatar with ring */}
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#D4AF37] via-[#E5C158] to-[#D4AF37] opacity-60 blur-md group-hover:opacity-80 transition-opacity duration-500" />
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-2 border-[#D4AF37]/50 bg-[#1a1a1a] text-4xl font-bold text-[#D4AF37] shadow-2xl">
              {initials}
            </div>
            {/* Crown icon */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-[#E5C158] to-[#D4AF37] shadow-lg">
                <ShieldCheck size={16} className="text-black" />
              </div>
            </div>
          </div>

          {/* Name + Meta */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-bold text-white tracking-tight">{profile.name}</h1>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="flex items-center gap-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold text-[#D4AF37]">
                <ShieldCheck size={14} />
                Administrator
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                <UserRound size={14} />
                {profile.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 sm:justify-start">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} />
                Joined {profile.createdAt}
              </span>
              {profile.lastLoginAt && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  Last login {profile.lastLoginAt}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center transition-colors hover:border-[#D4AF37]/20 hover:bg-[#D4AF37]/[0.03]">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <Users size={20} />
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalLeads.toLocaleString()}</p>
            <p className="mt-1 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Leads</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center transition-colors hover:border-[#D4AF37]/20 hover:bg-[#D4AF37]/[0.03]">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <UserCog size={20} />
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalSalespersons.toLocaleString()}</p>
            <p className="mt-1 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Salespersons</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center transition-colors hover:border-[#D4AF37]/20 hover:bg-[#D4AF37]/[0.03]">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <UserRoundCheck size={20} />
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalCustomers.toLocaleString()}</p>
            <p className="mt-1 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Customers</p>
          </div>
        </div>
      </div>
    </div>
  );
}
