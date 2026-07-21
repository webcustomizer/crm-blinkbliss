"use client";

import { useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";

import ReportStats from "./ReportStats";
import SalesReportTable from "./SalesReportTable";

const StatusChart = dynamic(() => import("./StatusChart"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded-2xl bg-zinc-900 border border-white/5" />
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
  timeSeries: { date: string; Leads: number; Joined: number; Dead: number }[];
};

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

export default function ReportsDashboard() {
  const [dateFilter] = useState("ALL");
  const { data, isLoading } = useSWR<ReportData & { success: boolean }>(
    `/api/admin/reports/stats?filter=${dateFilter}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
    },
  );

  if (isLoading || !data?.success) {
    return (
      <div className="p-10 text-center text-gray-400">
        Loading Reports...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">
          Reports Dashboard
        </h1>
        <p className="mt-2 text-gray-400">
          Sales performance and lead analytics
        </p>
      </div>

      <ReportStats statusCounts={data.statusCounts} total={data.total} />
      <StatusChart statusCounts={data.statusCounts} />
      <SalesReportTable salespersonReport={data.salespersonReport} />
    </div>
  );
}
