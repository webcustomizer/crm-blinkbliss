"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

import LeadsTable from "./LeadsTable";
import LeadFilters from "@/components/sales/my-leads/LeadFilters";
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
  isPriority: boolean;
  nextFollowUp: string | null;
  createdAt: string;
  remarks: string | null;
}

const PAGE_SIZE = 10;

export default function MyLeads({ userId }: { userId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const currentPageRef = useRef(1);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [completion, setCompletion] = useState("");
  const completionRef = useRef("");

  const searchRef = useRef("");
  const statusRef = useRef("");

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    completionRef.current = completion;
  }, [completion]);

  async function getLeads(showLoader = false, page = currentPage) {
    try {
      if (showLoader) setLoading(true);

      const params = new URLSearchParams();

      if (searchRef.current) params.append("search", searchRef.current);
      if (statusRef.current) params.append("status", statusRef.current);
      if (completionRef.current) params.append("completion", completionRef.current);

      params.append("page", String(page));
      params.append("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/team-leader/leads?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        setLeads(data.leads || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      // silent
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => void getLeads(true, 1), 0);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    const idle = setTimeout(() => {
      channel = supabase
        .channel("tl-my-leads")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "Lead",
            ...(userId ? { filter: `assignedToId=eq.${userId}` } : {}),
          },
          () => {
            void getLeads(false, currentPageRef.current);
          },
        )
        .subscribe(() => {});
    }, 1500);

    return () => {
      clearTimeout(t);
      clearTimeout(idle);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      void getLeads(false, 1);
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, completion]);

  useEffect(() => {
    const leadIdFromUrl = searchParams.get("leadId");

    const timer = setTimeout(() => {
      setSelectedLeadId(leadIdFromUrl || null);
    }, 0);

    return () => clearTimeout(timer);
  }, [searchParams]);

  function handlePageChange(page: number) {
    setCurrentPage(page);
    void getLeads(false, page);
  }

  function openLead(lead: Lead) {
    setSelectedLeadId(lead.id);

    const params = new URLSearchParams(searchParams.toString());
    params.set("leadId", lead.id);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function closeLead() {
    setSelectedLeadId(null);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("leadId");
    const query = params.toString();
    router.replace(query ? `?${query}` : window.location.pathname, {
      scroll: false,
    });
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-20 animate-pulse rounded-xl bg-white/[0.06]" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="h-3 w-24 animate-pulse rounded-lg bg-white/[0.04]" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">
          My Leads
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Manage your assigned leads and follow ups
        </p>
      </div>

      <LeadFilters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        completion={completion}
        setCompletion={setCompletion}
      />

      <LeadsTable
        leads={leads}
        onView={openLead}
        total={total}
        totalPages={totalPages}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        pageSize={PAGE_SIZE}
      />

      {selectedLeadId && (
        <LeadDetails leadId={selectedLeadId} onClose={closeLead} />
      )}
    </div>
  );
}
