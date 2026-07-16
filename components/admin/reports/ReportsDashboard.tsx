"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import ReportStats from "./ReportStats";
import SalesReportTable from "./SalesReportTable";

import { supabase } from "@/lib/supabase";

// recharts is a large dependency — load it only when this dashboard is
// actually rendered, instead of shipping it in every admin bundle.
const StatusChart = dynamic(() => import("./StatusChart"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded-2xl bg-zinc-900 border border-white/5" />
  ),
});

type LeadStatus =
  | "CALLED"
  | "NEED_MORE_FOLLOW_UP"
  | "TRAINING_ATTENDED"
  | "SEAT_RESERVED"
  | "JOINED"
  | "DEAD"
  | string;

type Lead = {
  id: string;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
  status: LeadStatus;
};



export default function ReportsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);

  const [loading, setLoading] = useState(true);

  async function getLeads() {
    try {
      const res = await fetch("/api/admin/leads?page=1&limit=1000&filter=ALL", {
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
    void Promise.resolve().then(getLeads);

    const channel = supabase
      .channel("reports-dashboard")
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

  if (loading) {
    return (
      <div
        className="
      p-10
      text-center
      text-gray-400
      "
      >
        Loading Reports...
      </div>
    );
  }

  return (
    <div
      className="
      space-y-8
      "
    >
      <div>
        <h1
          className="
          text-3xl
          font-bold
          text-[#D4AF37]
          "
        >
          Reports Dashboard
        </h1>

        <p
          className="
          mt-2
          text-gray-400
          "
        >
          Sales performance and lead analytics
        </p>
      </div>

      {/* TOP STATS */}

      <ReportStats leads={leads} />

      {/* STATUS GRAPH */}

      <StatusChart leads={leads} />

      <SalesReportTable leads={leads} />
    </div>
  );
}
