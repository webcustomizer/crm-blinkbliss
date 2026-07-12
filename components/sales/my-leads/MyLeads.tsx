"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import LeadCard from "./LeadCard";
import LeadsTable from "./LeadsTable";
import LeadFilters from "./LeadFilters";
import LeadDetails from "./LeadDetails";

interface Lead {
  id: string;

  name: string | null;

  phone: string;

  city: string | null;

  status: string;

  nextFollowUp: string | null;

  createdAt: string;

  remarks: string | null;
}

export default function MyLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);

  // Sirf first page load ke liye
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("");

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  async function getLeads(showLoader = false) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const params = new URLSearchParams();

      if (search) {
        params.append("search", search);
      }

      if (status) {
        params.append("status", status);
      }

      const res = await fetch(`/api/salesperson/leads?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.log("My Leads Error:", error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    // Defer initial load to avoid synchronous setState within effect
    const t = setTimeout(() => void getLeads(true), 0);

    const channel = supabase
      .channel("sales-my-leads")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Lead",
        },
        () => {
          console.log("My Leads Updated");
          void getLeads(false);
        },
      )
      .subscribe((status) => {
        console.log("My Leads Realtime:", status);
      });

    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void getLeads(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [search, status]);

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
        Loading Leads...
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
          My Leads
        </h1>

        <p
          className="
            mt-2
            text-sm
            text-zinc-400
          "
        >
          Manage your assigned leads and follow ups
        </p>
      </div>

      <LeadFilters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
      />

      {/* Desktop */}
      <div className="hidden lg:block">
        <LeadsTable leads={leads} onView={(lead) => setSelectedLead(lead)} />
      </div>

      {/* Mobile */}
      <div
        className="
          space-y-4
          lg:hidden
        "
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onView={() => setSelectedLead(lead)}
          />
        ))}
      </div>

      {selectedLead && (
        <LeadDetails
          leadId={selectedLead.id}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
