"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

import ReportStats from "./ReportStats";
import StatusChart from "./StatusChart";
import SalesReportTable from "./SalesReportTable";
import DateFilter from "./DateFilter";

export default function ReportsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesReport, setSalesReport] = useState([]);
  const [dateFilter, setDateFilter] = useState("ALL");

  async function getLeads() {
    const reportRes = await fetch("/api/admin/reports/sales", {
      cache: "no-store",
    });

    const reportJson = await reportRes.json();

    setSalesReport(reportJson);
    try {
      setLoading(true);

      const res = await fetch("/api/admin/leads?page=1&limit=5000&filter=ALL", {
        cache: "no-store",
      });

      const json = await res.json();

      setLeads(json.data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getLeads();

    const channel = supabase
      .channel("reports-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Lead",
        },
        () => {
          getLeads();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredLeads = useMemo(() => {
    if (dateFilter === "ALL") return leads;

    const now = new Date();

    return leads.filter((lead) => {
      if (!lead.createdAt) return false;

      const created = new Date(lead.createdAt);

      switch (dateFilter) {
        case "TODAY":
          return created.toDateString() === now.toDateString();

        case "WEEK": {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return created >= weekAgo;
        }

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
      <div className="p-10 text-center text-gray-400">Loading Reports...</div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">Reports</h1>

        <p className="mt-2 text-gray-400">Lead analytics & sales performance</p>
      </div>

      <DateFilter value={dateFilter} onChange={setDateFilter} />

      <ReportStats leads={filteredLeads} />

      <SalesReportTable leads={filteredLeads} />

      <div
        className="
        rounded-2xl
        border
        border-[#D4AF37]/20
        bg-[#111111]
        p-5
        shadow-xl
        "
      >
        <StatusChart leads={filteredLeads} />
      </div>
    </div>
  );
}
