"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Search, ChevronLeft, ChevronRight, Trash2, CheckSquare,
  Square, RotateCcw, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type TrashedLead = {
  id: string;
  name: string | null;
  phone: string;
  city: string | null;
  status: string;
  deletedAt: string | null;
  deletedBy: { name: string } | null;
};

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

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function TrashTable() {
  const [data, setData] = useState<TrashedLead[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchData = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (!hasLoaded) setInitialLoading(true);
        else if (!opts?.silent) setRefreshing(true);
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          search,
        });
        const res = await fetch(`/api/admin/leads/soft-delete?${params}`, { cache: "no-store" });
        const result = await res.json();
        setData(result.data || []);
        setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
      } catch {
        toast.error("Failed to load trash.");
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
        setHasLoaded(true);
      }
    },
    [hasLoaded, page, limit, search],
  );

  const fetchDataRef = useRef(fetchData);
  useEffect(() => { fetchDataRef.current = fetchData; });

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; void Promise.resolve().then(() => fetchData()); return; }
    const timer = setTimeout(() => { void Promise.resolve().then(() => fetchData()); }, 400);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("trash-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "Lead" }, () => {
        fetchDataRef.current?.({ silent: true });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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

  async function restoreLeads(ids: string[]) {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/leads/soft-delete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setSelectedIds(new Set());
        fetchData();
      } else {
        toast.error(json.message || "Restore failed.");
      }
    } catch {
      toast.error("Restore failed — network error.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function permanentDelete(ids: string[]) {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/leads/soft-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setSelectedIds(new Set());
        fetchData();
      } else {
        toast.error(json.message || "Delete failed.");
      }
    } catch {
      toast.error("Delete failed — network error.");
    } finally {
      setBulkLoading(false);
    }
  }

  function handleRestore(ids: string[]) {
    if (!window.confirm(`Restore ${ids.length} lead${ids.length > 1 ? "s" : ""}? They will reappear in the Leads list.`)) return;
    restoreLeads(ids);
  }

  function handlePermanentDelete(ids: string[]) {
    if (!window.confirm(`Are you sure you want to permanently delete ${ids.length} lead${ids.length > 1 ? "s" : ""}? This action CANNOT be undone.`)) return;
    permanentDelete(ids);
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-[28px] border border-[#D4AF37]/15 bg-gradient-to-br from-[#171717] to-[#0d0d0d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
        <p className="text-sm text-white/40">Loading trash…</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-[90px]" />

      {/* SEARCH BAR */}
      <div className="relative flex flex-col gap-4 border-b border-white/10 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Trash2 size={16} className="text-red-400/70" />
            <span>{pagination.total} deleted lead{pagination.total !== 1 ? "s" : ""}</span>
          </div>
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
            <button
              onClick={() => handleRestore(Array.from(selectedIds))}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 rounded-lg bg-[#D4AF37]/20 px-3 py-1 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/30 disabled:opacity-40"
            >
              <RotateCcw size={12} /> Restore
            </button>
            <button
              onClick={() => handlePermanentDelete(Array.from(selectedIds))}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 rounded-lg bg-red-600/20 px-3 py-1 text-xs text-red-400 hover:bg-red-600/30 disabled:opacity-40"
            >
              <Trash2 size={12} /> Delete Forever
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
              Updating…
            </div>
          </div>
        )}

        <div className="flex justify-end items-center px-4 py-3 sm:px-6">
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.03]">
              <Trash2 size={32} className="text-white/10" />
            </div>
            <p className="text-lg font-semibold text-white">Trash is empty</p>
            <p className="mt-1.5 text-sm text-white/40">No deleted leads to show.</p>
          </div>
        ) : (
          <table className="w-full text-sm transition-opacity duration-200">
            <thead>
              <tr className="border-b border-white/10 bg-black/20">
                <th className="p-3 w-10"></th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Name</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Phone</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70 hidden md:table-cell">City</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Status</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70 hidden lg:table-cell">Deleted On</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70 hidden lg:table-cell">Deleted By</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">Actions</th>
              </tr>
            </thead>
            <tbody className={`transition-opacity duration-200 ${refreshing ? "opacity-40" : "opacity-100"}`}>
              {data.map((lead) => {
                const isSelected = selectedIds.has(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-white/5 text-white/70 transition-colors duration-500 hover:bg-[#D4AF37]/[0.04] ${isSelected ? "bg-[#D4AF37]/[0.12]" : ""}`}
                  >
                    <td className="p-3">
                      <button onClick={() => toggleSelect(lead.id)} className="text-white/40 hover:text-[#D4AF37] transition-colors">
                        {isSelected ? <CheckSquare size={16} className="text-[#D4AF37]" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="p-3 font-medium text-white">{lead.name || "—"}</td>
                    <td className="p-3">{lead.phone}</td>
                    <td className="p-3 hidden md:table-cell">{lead.city || "—"}</td>
                    <td className="p-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyle(lead.status)}`}>
                        {lead.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="p-3 text-white/50 hidden lg:table-cell">{formatDate(lead.deletedAt)}</td>
                    <td className="p-3 text-white/50 hidden lg:table-cell">{lead.deletedBy?.name || "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRestore([lead.id])}
                          disabled={bulkLoading}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-3 py-1.5 text-xs font-medium text-[#D4AF37] transition-colors hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 disabled:opacity-40"
                        >
                          <RotateCcw size={14} />
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete([lead.id])}
                          disabled={bulkLoading}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* PAGINATION */}
        <div className="flex items-center justify-between border-t border-white/10 p-4 sm:p-5">
          <p className="text-sm text-white/40">Page {pagination.page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] disabled:pointer-events-none disabled:opacity-30"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
