"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import StatsCards from "./StatsCards";
import TodayFollowUps from "./TodayFollowUps";
import RecentActivity from "./RecentActivity";

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  calledLeads: number;
  trainingLeads: number;
  reservedLeads: number;
  joinedLeads: number;
  deadLeads: number;
  todayFollowUps: number;
  upcomingFollowUps: number;
  overdueFollowUps: number;
  conversionRate: number;
}

export default function SalesDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [loading, setLoading] = useState(true);

  async function getDashboard() {
    try {
      const res = await fetch("/api/salesperson/dashboard", {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.log("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    const initDashboard = async () => {
      if (mounted) {
        await getDashboard();
      }
    };

    initDashboard();

    const channel = supabase

      .channel("sales-dashboard")

      .on(
        "postgres_changes",

        {
          event: "*",
          schema: "public",
          table: "Lead",
        },

        async (payload) => {
          console.log("SALESPERSON DASHBOARD UPDATE:", payload);

          if (mounted) {
            await getDashboard();
          }
        },
      )

      .subscribe((status) => {
        console.log("Sales Dashboard Realtime:", status);
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div
        className="
      flex
      min-h-[60vh]
      items-center
      justify-center
      text-[#D4AF37]
      "
      >
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="
        text-3xl
        font-bold
        text-[#D4AF37]
        "
        >
          Sales Dashboard
        </h1>

        <p
          className="
        mt-2
        text-sm
        text-zinc-400
        "
        >
          Manage your leads and daily follow ups
        </p>
      </div>

      {stats && <StatsCards stats={stats} />}

      <div
        className="
  grid
  min-w-0
  grid-cols-1
  gap-5
  lg:grid-cols-2
  "
      >
        <TodayFollowUps />

        <RecentActivity />
      </div>
    </div>
  );
}
