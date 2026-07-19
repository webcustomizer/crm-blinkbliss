"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

import { supabase } from "@/lib/supabase";

import ReportStats from "./ReportStats";
import SalesReportTable from "./SalesReportTable";
import DateFilter from "./DateFilter";

const StatusChart = dynamic(() => import("./StatusChart"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full animate-pulse rounded-2xl border border-white/5 bg-zinc-900" />
  ),
});

const FunnelChart = dynamic(() => import("./FunnelChart"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full animate-pulse rounded-2xl border border-white/5 bg-zinc-900" />
  ),
});

const TimeSeriesChart = dynamic(() => import("./TimeSeriesChart"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full animate-pulse rounded-2xl border border-white/5 bg-zinc-900" />
  ),
});

type Lead = {
  id: string;
  status: string;
  createdAt: string;
  assignedTo?: { id: string; name: string } | null;
};

type FunnelData = {
  stages: { stage: string; count: number; percentage: number }[];
  deadCount: number;
  totalLeads: number;
};

export default function ReportsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("ALL");
  const [funnel, setFunnel] = useState<FunnelData | null>(null);

  const getLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/leads?page=1&limit=5000&filter=ALL", {
        cache: "no-store",
      });
      const json = await res.json();
      setLeads(json.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const getFunnel = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics/funnel", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) setFunnel(json.data);
    } catch {}
  }, []);

  const getLeadsRef = useRef(getLeads);
  useEffect(() => {
    getLeadsRef.current = getLeads;
  });

  useEffect(() => {
    void Promise.resolve().then(getLeads);
    void Promise.resolve().then(getFunnel);

    const channel = supabase
      .channel("reports-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Lead" },
        () => {
          getLeadsRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getLeads, getFunnel]);

  const filteredLeads = useMemo(() => {
    if (dateFilter === "ALL") return leads;
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    return leads.filter((lead) => {
      if (!lead.createdAt) return false;
      const created = new Date(lead.createdAt);
      switch (dateFilter) {
        case "TODAY":
          return created >= todayStart && created <= todayEnd;
        case "WEEK":
          return (
            created >= new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
          );
        case "MONTH":
          return (
            created.getMonth() === now.getMonth() &&
            created.getFullYear() === now.getFullYear()
          );
        default:
          return true;
      }
    });
  }, [leads, dateFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
        <p className="text-sm text-gray-400">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#D4AF37]">
            Advanced Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Lead performance & sales pipeline insights
          </p>
        </div>
        <DateFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      {/* KPI Cards */}
      <ReportStats leads={filteredLeads} />

      {/* Charts Row — Funnel + Status Distribution */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {funnel && (
          <FunnelChart
            stages={funnel.stages}
            totalLeads={funnel.totalLeads}
            deadCount={funnel.deadCount}
          />
        )}
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#111111] p-6">
          <StatusChart leads={filteredLeads} />
        </div>
      </div>

      {/* Time Series */}
      <TimeSeriesChart leads={filteredLeads} />

      {/* Salesperson Performance Table */}
      <SalesReportTable leads={filteredLeads} />
    </div>
  );
}
