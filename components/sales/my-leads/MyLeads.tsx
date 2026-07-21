"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

export default function MyLeads({ userId }: { userId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  const [currentPage, setCurrentPage] = useState(1);
  const currentPageRef = useRef(1);

  // Sirf first page load ke liye
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("");

  // LeadDetails sirf leadId use karta hai (khud fetch kar leta hai),
  // isliye poora Lead object rakhne ki zaroorat nahi — sirf id.
  // Isse notification se seedha ek lead open karna aasan ho jata hai,
  // chahe woh lead current page/filter mein listed ho ya na ho.
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Keep ref in sync with state so realtime callback always reads the
  // latest page number (avoids stale closure capture).
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

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
            ...(userId ? { filter: `assignedToId=eq.${userId}` } : {}),
          },
          () => {

            void getLeads(false, currentPageRef.current);
          },
        )
        .subscribe((status) => {

        });
    }, 1500);

    return () => {
      clearTimeout(t);
      clearTimeout(idle);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Search/status change hone par page 1 par reset karke fetch karein
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      void getLeads(false, 1);
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  // Deep-link support: /sales/my-leads?leadId=xyz auto-opens that lead's
  // detail panel. This is what notification clicks (lead assigned, etc.)
  // navigate to. It's also what keeps the panel in sync with the back
  // button: when BackButtonHandler / router.back() removes ?leadId from
  // the URL, this effect needs to close the panel too — not just open
  // it when the param appears.
  useEffect(() => {
    const leadIdFromUrl = searchParams.get("leadId");

    const timer = setTimeout(() => {
      setSelectedLeadId(leadIdFromUrl || null);
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handlePageChange(page: number) {
    setCurrentPage(page);
    void getLeads(false, page);
  }

  function openLead(lead: Lead) {
    setSelectedLeadId(lead.id);

    // Keep the URL in sync so refresh/share/back-button behave sensibly.
    // push (not replace) so opening a lead adds a real history entry —
    // this makes swipe/back navigation go: lead detail -> list -> dashboard,
    // instead of skipping straight back to dashboard.
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
