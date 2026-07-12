"use client";

import { useEffect, useState } from "react";

import ReportStats from "./ReportStats";
import StatusChart from "./StatusChart";
import SalesReportTable from "./SalesReportTable";

import { supabase } from "@/lib/supabase";

export default function ReportsDashboard() {
  const [leads, setLeads] = useState<any[]>([]);

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
    getLeads();

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

  const salespersonMap: any = {};

  leads.forEach((lead) => {
    const person = lead.assignedTo;

    if (!person) return;

    if (!salespersonMap[person.id]) {
      salespersonMap[person.id] = {
        id: person.id,

        name: person.name,

        total: 0,

        called: 0,

        followups: 0,

        training: 0,

        reserved: 0,

        joined: 0,

        dead: 0,
      };
    }

    const data = salespersonMap[person.id];

    data.total++;

    switch (lead.status) {
      case "CALLED":
        data.called++;
        break;

      case "NEED_MORE_FOLLOW_UP":
        data.followups++;
        break;

      case "TRAINING_ATTENDED":
        data.training++;
        break;

      case "SEAT_RESERVED":
        data.reserved++;
        break;

      case "JOINED":
        data.joined++;
        break;

      case "DEAD":
        data.dead++;
        break;
    }
  });

  const salesReport = Object.values(salespersonMap);

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

      {/* SALESPERSON REPORT */}

      <SalesReportTable data={salesReport as any} />
    </div>
  );
}
