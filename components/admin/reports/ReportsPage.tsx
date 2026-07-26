"use client";

import { useMemo, useCallback, useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";

import ReportStats from "./ReportStats";
import SalesReportTable from "./SalesReportTable";
import DateFilter from "./DateFilter";

const StatusChart = dynamic(() => import("./StatusChart"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full animate-pulse rounded-2xl border border-white/5 bg-zinc-900" />
  ),
});

const TeamPerformance = dynamic(() => import("./TeamPerformance"), {
  ssr: false,
  loading: () => (
    <div className="rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-white/5" />
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-white/5" />
          <div className="h-3 w-56 animate-pulse rounded bg-white/5" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-[20px] bg-white/5 mb-3" />
      ))}
    </div>
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

type ReportData = {
  total: number;
  statusCounts: Record<string, number>;
  salespersonReport: {
    id: string;
    name: string;
    total: number;
    called: number;
    followups: number;
    training: number;
    reserved: number;
    joined: number;
    dead: number;
  }[];
  timeSeries: {
    date: string;
    Leads: number;
    Joined: number;
    Dead: number;
  }[];
};

type FunnelData = {
  stages: { stage: string; count: number; percentage: number }[];
  deadCount: number;
  totalLeads: number;
};

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

export default function ReportsPage() {
  const [dateFilter, setDateFilter] = useState("ALL");

  const { data: reportData, isLoading } = useSWR<{ success: boolean; data: ReportData }>(
    `/api/admin/reports/stats?filter=${dateFilter}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
    },
  );

  const { data: funnelData } = useSWR<{ success: boolean; data: FunnelData }>(
    "/api/admin/analytics/funnel",
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
    },
  );

  const { data: teamData } = useSWR<{ success: boolean; data: { summary: any; teams: any[] } }>(
    `/api/admin/reports/team-performance?filter=${dateFilter}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
    },
  );

  const funnel = funnelData?.success ? funnelData.data : null;

  if (isLoading || !reportData?.success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
        <p className="text-sm text-gray-400">{isLoading ? "Loading analytics…" : "Failed to load. Please refresh."}</p>
      </div>
    );
  }

  const d = reportData.data;

  const statusLeads = Object.entries(d.statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

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
      <ReportStats statusCounts={d.statusCounts} total={d.total} />

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
          <StatusChart statusCounts={d.statusCounts} />
        </div>
      </div>

      {/* Time Series */}
      <TimeSeriesChart timeSeries={d.timeSeries} />

      {/* Salesperson Performance Table */}
      <SalesReportTable salespersonReport={d.salespersonReport} />

      {/* Team Performance */}
      {teamData?.success && teamData.data && (
        <TeamPerformance
          summary={teamData.data.summary}
          teams={teamData.data.teams}
        />
      )}
    </div>
  );
}
