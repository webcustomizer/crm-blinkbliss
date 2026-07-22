"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";

import StatsCards from "./StatsCards";
import TodayStats from "./TodayStats";
import FollowUpCards from "./FollowUpCards";
import LeadAnalytics from "./LeadAnalytics";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

export default function AdminDashboard() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/admin/dashboard/stats",
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    },
  );

  if (isLoading) {
    return (
      <div className="p-10 text-center text-gray-400">
        Loading Dashboard...
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="p-10 text-center text-red-400">
        Failed to load dashboard. Please refresh.
      </div>
    );
  }

  const stats = data.data;

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-gray-400">
          CRM Overview & Performance
        </p>
      </div>

      {/* STATS */}
      <StatsCards stats={stats} />

      {/* TODAY PERFORMANCE */}
      <TodayStats stats={stats} />

      <FollowUpCards stats={stats} />

     

      <LeadAnalytics stats={stats} />
    </div>
  );
}
