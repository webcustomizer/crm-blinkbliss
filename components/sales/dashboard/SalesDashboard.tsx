"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const getDashboard = useCallback(async (isBackground = false) => {
    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isBackground) {
      setRefreshing(true);
    }

    try {
      const res = await fetch("/api/salesperson/dashboard", {
        cache: "no-store",
        signal: controller.signal,
      });

      const data = await res.json();

      if (res.ok) {
        setStats(data.stats);
        setError(false);
      } else {
        console.log("Dashboard Fetch Failed:", res.status, data);
        if (!isBackground) setError(true);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.log("Dashboard Error:", err);
      if (!isBackground) setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Debounced background refetch, so bursts of realtime events
  // collapse into a single API call instead of many
  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      getDashboard(true);
    }, 600);
  }, [getDashboard]);

  useEffect(() => {
    let mounted = true;

    const initialFetch = setTimeout(() => {
      if (mounted) {
        getDashboard(false);
      }
    }, 0);

    // Defer realtime subscription so the WebSocket doesn't open
    // during initial render/TBT window
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const idle = setTimeout(() => {
      if (!mounted) return;
      channel = supabase
        .channel("sales-dashboard")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "Lead",
          },
          () => {
            if (mounted) scheduleRefresh();
          },
        )
        .subscribe((status) => {
          console.log("Sales Dashboard Realtime:", status);
        });
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(initialFetch);
      clearTimeout(idle);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      if (channel) supabase.removeChannel(channel);
    };
  }, [getDashboard, scheduleRefresh]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-800" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-zinc-800/70" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-zinc-900 border border-white/5"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-900 border border-white/5" />
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-900 border border-white/5" />
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-zinc-400">
          Failed to load dashboard. Please check your connection.
        </p>

        <button
          onClick={() => {
            setLoading(true);
            setError(false);
            getDashboard(false);
          }}
          className="
          rounded-xl
          bg-[#D4AF37]
          px-6
          py-2.5
          font-semibold
          text-black
          transition
          active:scale-95
          "
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-1 sm:px-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#D4AF37] sm:text-3xl">
            Sales Dashboard
          </h1>

          <p className="mt-1 text-sm text-zinc-400 sm:mt-2">
            Manage your leads and daily follow ups
          </p>
        </div>

        {refreshing && (
          <span className="mt-1 shrink-0 text-xs text-[#D4AF37]/70">
            Updating…
          </span>
        )}
      </div>

      {stats && <StatsCards stats={stats} />}

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        <TodayFollowUps />
        <RecentActivity />
      </div>
    </div>
  );
}
