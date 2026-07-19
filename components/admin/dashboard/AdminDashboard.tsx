"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import StatsCards from "./StatsCards";
import TodayStats from "./TodayStats";
import FollowUpCards from "./FollowUpCards";
import LeadAnalytics from "./LeadAnalytics";
import FunnelChart from "./FunnelChart";

import type { LeadDetails } from "@/types/lead";

export default function AdminDashboard() {
  const [leads, setLeads] = useState<LeadDetails[]>([]);

  const [loading, setLoading] = useState(true);

  async function getLeads() {
    try {
      const res = await fetch(
        "/api/admin/leads?page=1&limit=10000000000000&filter=ALL",
        {
          cache: "no-store",
        },
      );

      const json = await res.json();

      setLeads((json.data as LeadDetails[]) || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await getLeads();
    })();

    const channel = supabase
      .channel("admin-dashboard")
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
      .subscribe((status) => {});

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
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div
      className="
      space-y-8
      "
    >
      {/* HEADER */}

      <div>
        <h1
          className="
          text-3xl
          font-bold
          text-[#D4AF37]
          "
        >
          Admin Dashboard
        </h1>

        <p
          className="
          mt-2
          text-gray-400
          "
        >
          CRM Overview & Performance
        </p>
      </div>

      {/* STATS */}

      <StatsCards leads={leads} />

      {/* TODAY PERFORMANCE */}

      <TodayStats leads={leads} />

      <FollowUpCards leads={leads} />

      <FunnelChart />

      <LeadAnalytics leads={leads} />
    </div>
  );
}
