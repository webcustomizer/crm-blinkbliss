"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, ChevronLeft, ChevronRight, Trash2, CheckSquare,
  Square, MoreHorizontal, Eye, Users, Calendar, RefreshCw, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import LeadDetailsPanel from "./LeadDetailsPanel";
import LeadDialog from "./LeadDialog";
import { LEAD_SOURCES } from "@/lib/constants/lead";
import { formatDateShort } from "@/lib/format-date";

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
  isPriority: boolean;
  createdAt: string;
  assignedTo?: { id: string; name: string } | null;
};

type Salesperson = { id: string; name: string };

interface Props { salespersons: Salesperson[] }

const STATUS_FILTERS: [string, string][] = [
  ["ALL", "All"], ["TODAY_FOLLOW_UP", "Today Follow Ups"], ["OVERDUE_FOLLOW_UP", "Overdue"],
  ["INCOMPLETE", "Incomplete"], ["UNASSIGNED", "Unassigned"],
  ["NEW", "New"], ["CALLED", "Called"], ["NEED_MORE_FOLLOW_UP", "Follow Up"],
  ["TRAINING_ATTENDED", "Training"], ["SEAT_RESERVED", "Reserved"],
  ["JOINED", "Joined"], ["DEAD", "Dead"],
];

const SEARCH_DEBOUNCE_MS = 400;

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

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyle(status)}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-white/40">—</span>;
  return (
    <span className="inline-flex rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/50">
      {LEAD_SOURCES.find((s) => s.value === source)?.label || source}
    </span>
  );
}

function Avatar({ label }: { label: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[10px] font-bold text-[#D4AF37]">
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function LeadsTable({ salespersons }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dashboardFilter = searchParams.get("filter");

  const [data, setData] = useState<Lead[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState(dashboardFilter || "ALL");
  const [salespersonId, setSalespersonId] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced value actually sent to the API
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

  // Only the free-text search needs debouncing — filter/select/page changes
  // should feel instant, so they aren't routed through this timer.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Guards against out-of-order responses: if the user changes filters
  // quickly, only the most recently issued request is allowed to update state.
  const requestIdRef = useRef(0);

  const getLeads = useCallback(
    async (opts?: { silent?: boolean }) => {
      const reqId = ++requestIdRef.current;
      try {
        if (!hasLoaded) setInitialLoading(true);
        else if (!opts?.silent) setRefreshing(true);
        const params = new URLSearchParams({
          page: String(page), limit: String(limit),
          search, filter, salespersonId, source: sourceFilter,
        });
        const res = await fetch(`/api/admin/leads?${params}`, { cache: "no-store" });
        if (reqId !== requestIdRef.current) return; // a newer request has since started
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const result = await res.json();
        setData(result.data || []);
        setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
        setLoadError(false);
      } catch {
        if (reqId !== requestIdRef.current) return;
        if (!hasLoaded) setLoadError(true);
        else toast.error("Failed to load leads.");
      } finally {
        if (reqId === requestIdRef.current) {
          setInitialLoading(false);
          setRefreshing(false);
          setHasLoaded(true);
        }
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

  // Realtime — channel name is scoped to this view so it can't collide with
  // the salesperson-side leads table subscribing at the same time.
  useEffect(() => {
    const channel = supabase.channel("admin-lead-changes")
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
                status: newRow.status ?? l.status, completion: newRow.completion ?? l.completion,
                isPriority: newRow.isPriority ?? l.isPriority,
                assignedTo: newRow.assignedToId ? (resolvedAssignedTo ? { id: resolvedAssignedTo.id, name: resolvedAssignedTo.name } : l.assignedTo) : null,
              };
            });
          });
          markUpdating(id); setTimeout(() => unmarkUpdating(id), 700);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [salespersons, markUpdating, unmarkUpdating]);

  useEffect(() => { void getLeads(); }, [getLeads]);

  async function assignLead(leadId: string, spId: string) {
    const target = salespersons.find((p) => p.id === spId) || null;
    const previous = data.find((l) => l.id === leadId)?.assignedTo ?? null;

    // Optimistic update so the dropdown reflects the change immediately,
    // rather than waiting on the realtime round-trip.
    setData((prev) => prev.map((l) => (l.id === leadId ? { ...l, assignedTo: target } : l)));
    markUpdating(leadId);

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/assign`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salespersonId: spId }),
      });
      const json = await response.json();
      if (!response.ok) {
        setData((prev) => prev.map((l) => (l.id === leadId ? { ...l, assignedTo: previous } : l)));
        toast.error(json.message || "Failed to assign lead.");
        return;
      }
      toast.success(json.message || (spId ? "Lead assigned successfully." : "Lead unassigned successfully."));
    } catch {
      setData((prev) => prev.map((l) => (l.id === leadId ? { ...l, assignedTo: previous } : l)));
      toast.error("Failed to assign lead — network error.");
    } finally {
      unmarkUpdating(leadId);
    }
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

  function updateFilter(setter: (v: string) => void, value: string) {
    setPage(1);
    setter(value);
  }

  // ---- Error state (only ever shown for a failed *first* load) ----
  if (loadError && !hasLoaded) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-[28px] border border-[#D4AF37]/15 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-8 text-center">
        <AlertTriangle size={28} className="text-red-400/80" />
        <p className="text-base font-semibold text-white">Couldn't load leads.</p>
        <p className="text-sm text-white/40">Check your connection and try again.</p>
        <button
          onClick={() => { setLoadError(false); void getLeads(); }}
          className="mt-2 flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.08] px-4 py-2 text-sm font-medium text-[#D4AF37] transition-colors hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-[28px] border border-[#D4AF37]/15 bg-gradient-to-br from-[#171717] to-[#0d0d0d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
        <p className="text-sm text-white/40">Loading leads…</p>
      </div>
    );
  }

  const allSelectedOnPage = selectedIds.size > 0 && selectedIds.size === data.length;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
      <LeadDetailsPanel onUpdate={() => getLeads()} />
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-[90px]" />

      {/* TOOLBAR */}
      <div className="relative flex flex-col gap-3 border-b border-white/10 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={searchInput}
              onChange={(e) => { setPage(1); setSearchInput(e.target.value); }}
              placeholder="Search name or phone…"
              aria-label="Search leads by name or phone"
              className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]/60"
            />
          </div>
          <div className="flex items-center gap-2">
            <Users size={15} className="hidden text-white/30 sm:block" aria-hidden />
            <select
              value={salespersonId}
              onChange={(e) => updateFilter(setSalespersonId, e.target.value)}
              aria-label="Filter by salesperson"
              className="cursor-pointer rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none hover:border-[#D4AF37]/40 focus:border-[#D4AF37]/60"
            >
              <option value="">All Salespersons</option>
              {salespersons.map((person) => (
                <option key={person.id} value={person.id} className="bg-[#111111] text-white">{person.name}</option>
              ))}
            </select>
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => updateFilter(setSourceFilter, e.target.value)}
            aria-label="Filter by source"
            className="cursor-pointer rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none hover:border-[#D4AF37]/40 focus:border-[#D4AF37]/60"
          >
            <option value="">All Sources</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#111111] text-white">{s.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 sm:ml-auto">
            <LeadDialog onLeadCreated={() => getLeads()} />
            <button
              onClick={toggleSelectAll}
              aria-pressed={allSelectedOnPage}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:border-[#D4AF37]/30 hover:text-white transition-colors"
            >
              {allSelectedOnPage ? <CheckSquare size={14} className="text-[#D4AF37]" /> : <Square size={14} />}
              Select All
            </button>
          </div>
        </div>

        {/* Status filter tab-strip */}
        <div role="tablist" aria-label="Filter leads by status" className="-mb-px flex items-center gap-1 overflow-x-auto pt-1">
          {STATUS_FILTERS.map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={filter === value}
              onClick={() => updateFilter(setFilter, value)}
              className={`relative shrink-0 whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
                filter === value ? "text-[#D4AF37]" : "text-white/45 hover:text-white/70"
              }`}
            >
              {label}
              {filter === value && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-[#D4AF37]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div aria-live="polite" className="relative flex flex-wrap items-center gap-3 border-b border-[#D4AF37]/20 bg-[#D4AF37]/[0.08] px-4 py-2.5 sm:px-6">
          <span className="text-sm font-medium text-[#D4AF37]">{selectedIds.size} selected</span>

          {/* Desktop: full inline actions */}
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
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
              aria-label="Assign selected leads to"
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

          {/* Mobile: collapse into a single "Actions" menu so buttons don't wrap awkwardly */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setShowBulkMenu((v) => !v)}
              disabled={bulkLoading}
              aria-haspopup="menu"
              aria-expanded={showBulkMenu}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white disabled:opacity-40"
            >
              <MoreHorizontal size={14} /> Actions
            </button>
            {showBulkMenu && (
              <div role="menu" className="absolute left-0 top-full z-30 mt-2 w-48 space-y-1 rounded-xl border border-white/10 bg-[#141414] p-2 shadow-xl">
                <button role="menuitem" onClick={() => bulkAction("status", "JOINED")} disabled={bulkLoading}
                  className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40">
                  Mark Joined
                </button>
                <button role="menuitem" onClick={() => bulkAction("status", "DEAD")} disabled={bulkLoading}
                  className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-40">
                  Mark Dead
                </button>
                <button role="menuitem" onClick={() => bulkAction("assign", "")} disabled={bulkLoading}
                  className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-blue-400 hover:bg-blue-500/10 disabled:opacity-40">
                  Unassign
                </button>
                <div className="border-t border-white/10 pt-1">
                  <select
                    onChange={(e) => { if (e.target.value) bulkAction("assign", e.target.value); }}
                    disabled={bulkLoading}
                    aria-label="Assign selected leads to"
                    defaultValue=""
                    className="w-full cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="">Assign to…</option>
                    {salespersons.map((sp) => (
                      <option key={sp.id} value={sp.id} className="bg-[#111111]">{sp.name}</option>
                    ))}
                  </select>
                </div>
                <button role="menuitem" onClick={() => bulkAction("delete")} disabled={bulkLoading}
                  className="flex w-full items-center gap-1 rounded-lg px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-600/10 disabled:opacity-40">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>

          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-white/50 hover:text-white">
            Clear
          </button>
        </div>
      )}

      {/* CONTENT */}
      <div className="relative">
        {refreshing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#D4AF37]/25 bg-[#111]/90 px-5 py-2.5 text-sm font-medium text-[#D4AF37] shadow-xl">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#D4AF37]/25 border-t-[#D4AF37]" />
              Updating leads…
            </div>
          </div>
        )}

        <div className="flex justify-end px-4 pt-3 sm:px-6">
          <p className="text-xs text-white/30">{pagination.total} lead{pagination.total === 1 ? "" : "s"} match this view</p>
        </div>

        {data.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-lg font-semibold text-white">No leads found.</p>
            <p className="mt-1.5 text-sm text-white/40">Try changing filters or selecting another salesperson.</p>
          </div>
        ) : (
          <>
            {/* MOBILE: card list — avoids a cramped, horizontally-scrolling table on small screens */}
            <div className={`space-y-2.5 p-4 transition-opacity duration-200 sm:hidden ${refreshing ? "opacity-40" : "opacity-100"}`}>
              {data.map((lead) => {
                const isUpdating = updatingIds.has(lead.id);
                const isSelected = selectedIds.has(lead.id);
                return (
                  <div
                    key={lead.id}
                    className={`rounded-2xl border p-3.5 transition-colors duration-500 ${
                      isSelected ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.1]" : "border-white/10 bg-black/20"
                    } ${isUpdating ? "bg-[#D4AF37]/[0.07]" : ""} ${lead.completion === "INCOMPLETE" ? "border-l-2 border-l-amber-500/40" : ""}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button onClick={() => toggleSelect(lead.id)} aria-label={isSelected ? "Deselect lead" : "Select lead"} className="mt-1 shrink-0 text-white/40 hover:text-[#D4AF37]">
                        {isSelected ? <CheckSquare size={16} className="text-[#D4AF37]" /> : <Square size={16} />}
                      </button>
                      <Avatar label={lead.name || lead.phone} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-medium text-white">{lead.name || "—"}</span>
                          {lead.completion === "INCOMPLETE" && (
                            <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                              Incomplete
                            </span>
                          )}
                          {lead.isPriority && (
                            <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                              Priority
                            </span>
                          )}
                          {isUpdating && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#D4AF37]" />}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-white/50">{lead.phone}{lead.city ? ` · ${lead.city}` : ""}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={lead.status} />
                          <SourceBadge source={lead.source} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-white/40">
                        <Calendar size={12} /> {formatDateShort(lead.createdAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={lead.assignedTo?.id || ""}
                          onChange={(e) => assignLead(lead.id, e.target.value)}
                          aria-label="Assign salesperson"
                          className="cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
                        >
                          <option value="">Unassigned</option>
                          {salespersons.map((person) => (
                            <option key={person.id} value={person.id} className="bg-[#111111]">{person.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("leadId", lead.id);
                            router.push(`?${params.toString()}`, { scroll: false });
                          }}
                          aria-label="View lead details"
                          className="flex items-center gap-1 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-2.5 py-1.5 text-xs font-medium text-[#D4AF37]"
                        >
                          <Eye size={13} /> View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP / TABLET: table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm transition-opacity duration-200">
                <thead>
                  <tr className="border-b border-white/10 bg-black/20">
                    <th className="p-3 w-10"></th>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Name</th>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Phone</th>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">City</th>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70 hidden md:table-cell">Source</th>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Status</th>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70 hidden lg:table-cell">Date</th>
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
                        className={`border-b border-white/5 text-white/70 transition-colors duration-500 hover:bg-[#D4AF37]/[0.04] ${isUpdating ? "bg-[#D4AF37]/[0.07]" : ""} ${isSelected ? "bg-[#D4AF37]/[0.12]" : ""} ${lead.completion === "INCOMPLETE" ? "border-l-2 border-l-amber-500/30" : ""}`}
                      >
                        <td className="p-3">
                          <button onClick={() => toggleSelect(lead.id)} aria-label={isSelected ? "Deselect lead" : "Select lead"} className="text-white/40 hover:text-[#D4AF37] transition-colors">
                            {isSelected ? <CheckSquare size={16} className="text-[#D4AF37]" /> : <Square size={16} />}
                          </button>
                        </td>
                        <td className="p-3 font-medium text-white">
                          <span className="inline-flex items-center gap-2.5">
                            <Avatar label={lead.name || lead.phone} />
                            <span className="max-w-[160px] truncate">{lead.name || "—"}</span>
                            {lead.completion === "INCOMPLETE" && (
                              <span
                                title="Missing one or more required fields"
                                className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400"
                              >
                                Incomplete
                              </span>
                            )}
                            {lead.isPriority && (
                              <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                                Priority
                              </span>
                            )}
                            {isUpdating && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#D4AF37]" title="Updating…" />}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">{lead.phone}</td>
                        <td className="p-3 max-w-[120px] truncate">{lead.city || "—"}</td>
                        <td className="p-3 hidden md:table-cell">
                          <SourceBadge source={lead.source} />
                        </td>
                        <td className="p-3">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="p-3 hidden text-xs text-white/45 lg:table-cell">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar size={12} className="text-white/25" />
                            {formatDateShort(lead.createdAt)}
                          </span>
                        </td>
                        <td className="p-3">
                          <select
                            value={lead.assignedTo?.id || ""}
                            onChange={(e) => assignLead(lead.id, e.target.value)}
                            aria-label={`Assign salesperson for ${lead.name || lead.phone}`}
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
            </div>
          </>
        )}

        {/* PAGINATION */}
        <div className="flex flex-col items-center gap-3 border-t border-white/10 p-4 sm:flex-row sm:justify-between sm:p-5">
          <p className="text-sm text-white/40">Page {pagination.page} of {pagination.totalPages}</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft size={16} /> <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="hidden items-center gap-1.5 sm:flex">
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
            </div>
            {/* Compact page indicator for mobile, replacing the full number strip */}
            <span className="rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white sm:hidden">
              {page} / {pagination.totalPages}
            </span>

            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] disabled:pointer-events-none disabled:opacity-30"
            >
              <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
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
                aria-label="Jump to page"
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