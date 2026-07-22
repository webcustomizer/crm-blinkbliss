"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, ChevronLeft, ChevronRight, Trash2, CheckSquare,
  Square, MoreHorizontal, ArrowUpDown, Eye,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import LeadDetailsPanel from "./LeadDetailsPanel";
import LeadDialog from "./LeadDialog";
import { LEAD_SOURCES } from "@/lib/constants/lead";

type Lead = {
  id: string;
  name: string | null;
  phone: string;
  city: string | null;
  currentStatus: string | null;
  purpose: string | null;
  source: string | null;
  status: string;
  completion: string;
  assignedTo?: { id: string; name: string } | null;
};

type Salesperson = { id: string; name: string };

interface Props { salespersons: Salesperson[] }

// Builds a compact page list with ellipses, e.g. for current=6, total=28:
// [1, "...", 4, 5, 6, 7, 8, "...", 28]
// Always shows first page, last page, and a window around the current page.
function getPageNumbers(current: number, total: number): (number | "...")[] {
  const siblingCount = 1;
  const totalNumbersShown = siblingCount * 2 + 5; // first, last, current, 2 ellipses, siblings

  if (total <= totalNumbersShown) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, total);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  const pages: (number | "...")[] = [1];

  if (showLeftEllipsis) pages.push("...");

  for (let i = Math.max(leftSibling, 2); i <= Math.min(rightSibling, total - 1); i++) {
    pages.push(i);
  }

  if (showRightEllipsis) pages.push("...");

  if (total > 1) pages.push(total);

  return pages;
}

export default function LeadsTable({ salespersons }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dashboardFilter = searchParams.get("filter");

  const [data, setData] = useState<Lead[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(dashboardFilter || "ALL");
  const [salespersonId, setSalespersonId] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  // Go-to-page input
  const [pageInput, setPageInput] = useState("");

  const markUpdating = useCallback((id: string) => {
    setUpdatingIds((prev) => { const next = new Set(prev); next.add(id); return next; });
  }, []);
  const unmarkUpdating = useCallback((id: string) => {
    setUpdatingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }, []);

  const getLeads = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (!hasLoaded) setInitialLoading(true);
        else if (!opts?.silent) setRefreshing(true);
        const params = new URLSearchParams({
          page: String(page), limit: String(limit),
          search, filter, salespersonId, source: sourceFilter,
        });
        const res = await fetch(`/api/admin/leads?${params}`, { cache: "no-store" });
        const result = await res.json();
        setData(result.data || []);
        setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
      } catch {
        toast.error("Failed to load leads.");
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
        setHasLoaded(true);
      }
    },
    [hasLoaded, page, limit, search, filter, salespersonId, sourceFilter],
  );

  useEffect(() => {
    if (!dashboardFilter) return;
    setFilter(dashboardFilter);
  }, [dashboardFilter]);

  const getLeadsRef = useRef(getLeads);
  useEffect(() => { getLeadsRef.current = getLeads; });

  // Realtime
  useEffect(() => {
    const channel = supabase.channel("lead-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "Lead" }, (payload: any) => {
        const eventType = payload.eventType;
        const newRow = payload.new as Record<string, any> | null;
        const oldRow = payload.old as Record<string, any> | null;
        if (eventType === "DELETE") {
          const id = oldRow?.id; if (!id) return;
          markUpdating(id);
          setTimeout(() => { setData((prev) => prev.filter((l) => l.id !== id)); unmarkUpdating(id); }, 250);
          return;
        }
        if (eventType === "INSERT") { getLeadsRef.current?.({ silent: true }); return; }
        if (eventType === "UPDATE") {
          const id = newRow?.id; if (!id) return;
          setData((prev) => {
            const exists = prev.some((l) => l.id === id);
            if (!exists) return prev;
            return prev.map((l) => {
              if (l.id !== id) return l;
              const assignedToChanged = newRow.assignedToId !== (l.assignedTo?.id ?? null);
              const resolvedAssignedTo = assignedToChanged
                ? salespersons.find((p) => p.id === newRow.assignedToId) || null : l.assignedTo;
              return {
                ...l, name: newRow.name ?? l.name, phone: newRow.phone ?? l.phone,
                city: newRow.city ?? l.city, currentStatus: newRow.currentStatus ?? l.currentStatus,
                purpose: newRow.purpose ?? l.purpose, source: newRow.source ?? l.source,
                status: newRow.status ?? l.status,
                assignedTo: newRow.assignedToId ? (resolvedAssignedTo ? { id: resolvedAssignedTo.id, name: resolvedAssignedTo.name } : l.assignedTo) : null,
              };
            });
          });
          markUpdating(id); setTimeout(() => unmarkUpdating(id), 700);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [salespersons, markUpdating, unmarkUpdating]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; void Promise.resolve().then(() => getLeads()); return; }
    const timer = setTimeout(() => { void Promise.resolve().then(() => getLeads()); }, 400);
    return () => clearTimeout(timer);
  }, [getLeads]);

  async function assignLead(leadId: string, spId: string) {
    try {
      const response = await fetch(`/api/admin/leads/${leadId}/assign`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salespersonId: spId }),
      });
      const json = await response.json();
      if (!response.ok) {
        toast.error(json.message || "Failed to assign lead.");
        return;
      }
      toast.success(json.message || (spId ? "Lead assigned successfully." : "Lead unassigned successfully."));
    } catch { toast.error("Failed to assign lead — network error."); }
  }

  // Bulk actions
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selectedIds.size === data.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(data.map((l) => l.id)));
  }
  async function bulkAction(action: string, value?: string) {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action, value }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setSelectedIds(new Set());
        setShowBulkMenu(false);
        if (action === "delete") getLeads();
      } else toast.error(json.message || "Bulk action failed.");
    } catch { toast.error("Bulk action failed — network error."); }
    finally { setBulkLoading(false); }
  }

  // Go to a specific page directly
  function jumpToPage() {
    const num = parseInt(pageInput, 10);
    if (!num || num < 1 || num > pagination.totalPages) {
      toast.error(`Enter a page between 1 and ${pagination.totalPages}`);
      return;
    }
    setPage(num);
    setPageInput("");
  }

  function statusStyle(status: string) {
    switch (status) {
      case "JOINED": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "DEAD": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "CALLED": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "SEAT_RESERVED": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "TRAINING_ATTENDED": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default: return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  }

  const filters = [
    ["ALL", "All"], ["TODAY_FOLLOW_UP", "Today Follow Ups"], ["OVERDUE_FOLLOW_UP", "Overdue"],
    ["INCOMPLETE", "Incomplete"], ["UNASSIGNED", "Unassigned"],
    ["NEW", "New"], ["CALLED", "Called"], ["NEED_MORE_FOLLOW_UP", "Follow Up"],
    ["TRAINING_ATTENDED", "Training"], ["SEAT_RESERVED", "Reserved"],
    ["JOINED", "Joined"], ["DEAD", "Dead"],
  ];

  if (initialLoading) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-[28px] border border-[#D4AF37]/15 bg-gradient-to-br from-[#171717] to-[#0d0d0d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
        <p className="text-sm text-white/40">Loading leads…</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#D4AF37]/20 ">
      <LeadDetailsPanel onUpdate={() => getLeads()} />
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full" />

      {/* TOP FILTER BAR */}
      <div className="relative flex flex-col gap-4 border-b border-white/10 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map(([value, label]) => (
            <button
              key={value}
              onClick={() => { setPage(1); setFilter(value); }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:py-2 sm:text-sm ${
                filter === value
                  ? "border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#D4AF37]"
                  : "border-white/10 text-white/50 hover:border-[#D4AF37]/30 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={salespersonId}
            onChange={(e) => { setPage(1); setSalespersonId(e.target.value); }}
            className="cursor-pointer rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none hover:border-[#D4AF37]/40 focus:border-[#D4AF37]/60"
          >
            <option value="">All Salespersons</option>
            {salespersons.map((person) => (
              <option key={person.id} value={person.id} className="bg-[#111111] text-white">{person.name}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => { setPage(1); setSourceFilter(e.target.value); }}
            className="cursor-pointer rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none hover:border-[#D4AF37]/40 focus:border-[#D4AF37]/60"
          >
            <option value="">All Sources</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#111111] text-white">{s.label}</option>
            ))}
          </select>
          <div className="relative sm:ml-auto sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Search name or phone…"
              className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]/60"
            />
          </div>
        </div>
      </div>

      {/* BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border-b border-[#D4AF37]/20 bg-[#D4AF37]/[0.08] px-4 py-2.5 sm:px-6">
          <span className="text-sm font-medium text-[#D4AF37]">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <button onClick={() => bulkAction("status", "JOINED")} disabled={bulkLoading}
              className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40">
              Mark Joined
            </button>
            <button onClick={() => bulkAction("status", "DEAD")} disabled={bulkLoading}
              className="rounded-lg bg-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/30 disabled:opacity-40">
              Mark Dead
            </button>
            <button onClick={() => bulkAction("assign", "")} disabled={bulkLoading}
              className="rounded-lg bg-blue-500/20 px-3 py-1 text-xs text-blue-400 hover:bg-blue-500/30 disabled:opacity-40">
              Unassign
            </button>
            <select
              onChange={(e) => { if (e.target.value) bulkAction("assign", e.target.value); }}
              disabled={bulkLoading}
              className="cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white outline-none"
            >
              <option value="">Assign to…</option>
              {salespersons.map((sp) => (
                <option key={sp.id} value={sp.id} className="bg-[#111111]">{sp.name}</option>
              ))}
            </select>
            <button onClick={() => bulkAction("delete")} disabled={bulkLoading}
              className="rounded-lg bg-red-600/20 px-3 py-1 text-xs text-red-400 hover:bg-red-600/30 disabled:opacity-40 flex items-center gap-1">
              <Trash2 size={12} /> Delete
            </button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-white/50 hover:text-white">
            Clear
          </button>
        </div>
      )}

      {/* TABLE */}
      <div className="relative overflow-x-auto">
        {refreshing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#D4AF37]/25 bg-[#111]/90 px-5 py-2.5 text-sm font-medium text-[#D4AF37] shadow-xl">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#D4AF37]/25 border-t-[#D4AF37]" />
              Updating leads…
            </div>
          </div>
        )}

        <div className="flex justify-between items-center px-4 py-3 sm:px-6">
          <LeadDialog onLeadCreated={() => getLeads()} />
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:border-[#D4AF37]/30 hover:text-white transition-colors"
          >
            {selectedIds.size === data.length && data.length > 0 ? <CheckSquare size={14} className="text-[#D4AF37]" /> : <Square size={14} />}
            Select All
          </button>
        </div>

        {data.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-lg font-semibold text-white">No leads found.</p>
            <p className="mt-1.5 text-sm text-white/40">Try changing filters or selecting another salesperson.</p>
          </div>
        ) : (
          <table className="w-full text-sm transition-opacity duration-200">
            <thead>
              <tr className="border-b border-white/10 bg-black/20">
                <th className="p-3 w-10"></th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Name</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Phone</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">City</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70 hidden md:table-cell">Source</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Status</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Assigned</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Action</th>
              </tr>
            </thead>
            <tbody className={`transition-opacity duration-200 ${refreshing ? "opacity-40" : "opacity-100"}`}>
              {data.map((lead) => {
                const isUpdating = updatingIds.has(lead.id);
                const isSelected = selectedIds.has(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-white/5 text-white/70 transition-colors duration-500 hover:bg-[#D4AF37]/[0.04] ${isUpdating ? "bg-[#D4AF37]/[0.07]" : ""} ${isSelected ? "bg-[#D4AF37]/[0.12]" : ""}`}
                  >
                    <td className="p-3">
                      <button onClick={() => toggleSelect(lead.id)} className="text-white/40 hover:text-[#D4AF37] transition-colors">
                        {isSelected ? <CheckSquare size={16} className="text-[#D4AF37]" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="p-3 font-medium text-white">
                      <span className="inline-flex items-center gap-2">
                        {lead.name || "—"}
                        {isUpdating && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#D4AF37]" title="Updating…" />}
                      </span>
                    </td>
                    <td className="p-3">{lead.phone}</td>
                    <td className="p-3">{lead.city || "—"}</td>
                    <td className="p-3 hidden md:table-cell">
                      {lead.source ? (
                        <span className="inline-flex rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/50">
                          {LEAD_SOURCES.find(s => s.value === lead.source)?.label || lead.source}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyle(lead.status)}`}>
                        {lead.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={lead.assignedTo?.id || ""}
                        onChange={(e) => assignLead(lead.id, e.target.value)}
                        className="cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none hover:border-[#D4AF37]/40 focus:border-[#D4AF37]/60"
                      >
                        <option value="">Select</option>
                        {salespersons.map((person) => (
                          <option key={person.id} value={person.id} className="bg-[#111111]">{person.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          params.set("leadId", lead.id);
                          router.push(`?${params.toString()}`, { scroll: false });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-3 py-1.5 text-xs font-medium text-[#D4AF37] transition-colors hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* PAGINATION */}
        <div className="flex flex-col items-center gap-3 border-t border-white/10 p-4 sm:flex-row sm:justify-between sm:p-5">
          <p className="text-sm text-white/40">Page {pagination.page} of {pagination.totalPages}</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            {getPageNumbers(page, pagination.totalPages).map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-sm text-white/30">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  disabled={p === page}
                  aria-current={p === page ? "page" : undefined}
                  className={`min-w-[36px] rounded-xl border px-3 py-2 text-sm font-medium transition-colors disabled:pointer-events-none ${
                    p === page
                      ? "border-[#D4AF37]/50 bg-[#D4AF37]/[0.12] text-[#D4AF37]"
                      : "border-white/10 text-white hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06]"
                  }`}
                >
                  {p}
                </button>
              ),
            )}

            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] disabled:pointer-events-none disabled:opacity-30"
            >
              Next <ChevronRight size={16} />
            </button>

            {/* Go to page */}
            <div className="ml-1 flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={pagination.totalPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") jumpToPage(); }}
                placeholder="Page #"
                className="w-20 rounded-xl border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={jumpToPage}
                className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.08] px-3 py-2 text-sm font-medium text-[#D4AF37] transition-colors hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}