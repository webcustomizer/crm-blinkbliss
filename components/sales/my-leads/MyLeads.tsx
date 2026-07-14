"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import LeadsTable from "./LeadsTable";
import LeadFilters from "./LeadFilters";
import dynamic from "next/dynamic";

const LeadDetails = dynamic(() => import("./LeadDetails"), {
  ssr: false,
});

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

const PAGE_SIZE = 10;

export default function MyLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  const [currentPage, setCurrentPage] = useState(1);

  // Sirf first page load ke liye
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("");

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  async function getLeads(showLoader = false, page = currentPage) {
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

      params.append("page", String(page));
      params.append("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/salesperson/leads?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        setLeads(data.leads || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
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
    const t = setTimeout(() => void getLeads(true, 1), 0);

    // Defer realtime subscription so the WebSocket doesn't open during
    // initial render/TBT window — improves mobile perf + bfcache
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const idle = setTimeout(() => {
      channel = supabase
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
            void getLeads(false, currentPage);
          },
        )
        .subscribe((status) => {
          console.log("My Leads Realtime:", status);
        });
    }, 1500);

    return () => {
      clearTimeout(t);
      clearTimeout(idle);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search/status change hone par page 1 par reset karke fetch karein
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      void getLeads(false, 1);
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  function handlePageChange(page: number) {
    setCurrentPage(page);
    void getLeads(false, page);
  }

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

      {/* Responsive: table on desktop, cards on mobile — server-side pagination */}
      <LeadsTable
        leads={leads}
        onView={(lead) => setSelectedLead(lead)}
        total={total}
        totalPages={totalPages}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        pageSize={PAGE_SIZE}
      />

      {selectedLead && (
        <LeadDetails
          leadId={selectedLead.id}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
