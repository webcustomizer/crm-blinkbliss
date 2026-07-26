"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Search, Users, Filter, Phone, MapPin,
  ArrowUpRight, CheckCircle2, X, RotateCcw, Loader2,
  UserCheck, Clock, ChevronLeft, ChevronRight, Star,
  Eye, UserMinus, MoreVertical, User, Briefcase, UserCircle, Calendar,
} from "lucide-react";
import dynamic from "next/dynamic";
import { formatDateShort } from "@/lib/format-date";

const TeamLeadDetailPanel = dynamic(() => import("@/components/team-leader/leads/TeamLeadDetailPanel"), { ssr: false });

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  source: string | null;
  status: string;
  followUpCount: number;
  createdAt: string;
  isPriority: boolean;
  nextFollowUp: string | null;
  assignedTo?: { id: string; name: string } | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  _count: { leads: number };
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  NEW: { bg: "bg-blue-500/[0.08]", border: "border-blue-500/20", text: "text-blue-400", dot: "bg-blue-400" },
  CALLED: { bg: "bg-yellow-500/[0.08]", border: "border-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-400" },
  NEED_MORE_FOLLOW_UP: { bg: "bg-orange-500/[0.08]", border: "border-orange-500/20", text: "text-orange-400", dot: "bg-orange-400" },
  TRAINING_ATTENDED: { bg: "bg-purple-500/[0.08]", border: "border-purple-500/20", text: "text-purple-400", dot: "bg-purple-400" },
  SEAT_RESERVED: { bg: "bg-cyan-500/[0.08]", border: "border-cyan-500/20", text: "text-cyan-400", dot: "bg-cyan-400" },
  JOINED: { bg: "bg-emerald-500/[0.08]", border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
  DEAD: { bg: "bg-red-500/[0.08]", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-400" },
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New", CALLED: "Called", NEED_MORE_FOLLOW_UP: "Follow Up",
  TRAINING_ATTENDED: "Training", SEAT_RESERVED: "Reserved", JOINED: "Joined", DEAD: "Dead",
};

const ALL_STATUSES = ["ALL", ...Object.keys(STATUS_COLORS)];

const PAGE_SIZE = 10;

export default function TeamLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignTo, setAssignTo] = useState("");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [completionFilter, setCompletionFilter] = useState("ALL");
  const [scope, setScope] = useState<"all" | "self" | "team">("all");
  const prevScopeRef = useRef("all");
  const [memberFilter, setMemberFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [distributing, setDistributing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [actionLeadId, setActionLeadId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const pageRef = useRef(1);
  const filterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [scopeCounts, setScopeCounts] = useState({ all: 0, self: 0, team: 0 });

  async function fetchScopeCounts(filters?: { search?: string; statusFilter?: string; completionFilter?: string; scope?: string; memberFilter?: string }) {
    try {
      const f = {
        search: filters?.search ?? search,
        statusFilter: filters?.statusFilter ?? statusFilter,
        completionFilter: filters?.completionFilter ?? completionFilter,
        scope: filters?.scope ?? scope,
        memberFilter: filters?.memberFilter ?? memberFilter,
      };
      const base = new URLSearchParams({ limit: "1" });
      if (f.search) base.set("search", f.search);
      if (f.statusFilter !== "ALL") base.set("filter", f.statusFilter);
      if (f.completionFilter !== "ALL") base.set("completion", f.completionFilter);
      if (f.memberFilter) base.set("memberId", f.memberFilter);

      const [allRes, selfRes, teamRes] = await Promise.all([
        fetch(`/api/team-leader/team-leads?scope=all&${base}`).then((r) => r.json()),
        fetch(`/api/team-leader/team-leads?scope=self&${base}`).then((r) => r.json()),
        fetch(`/api/team-leader/team-leads?scope=team&${base}`).then((r) => r.json()),
      ]);
      setScopeCounts({
        all: allRes.pagination?.total || 0,
        self: selfRes.pagination?.total || 0,
        team: teamRes.pagination?.total || 0,
      });
    } catch { /* silent */ }
  }

  const fetchData = useCallback(async (showLoader = false, pageNum = page, tableOnly = false) => {
    if (showLoader) {
      if (tableOnly) setTableLoading(true);
      else setInitialLoading(true);
    }
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("filter", statusFilter);
      if (completionFilter !== "ALL") params.set("completion", completionFilter);
      if (scope !== "all") params.set("scope", scope);
      if (memberFilter) params.set("memberId", memberFilter);

      const [leadsRes, teamRes] = await Promise.all([
        fetch(`/api/team-leader/team-leads?${params}`).then((r) => r.json()),
        fetch("/api/team-leader/team").then((r) => r.json()),
      ]);
      if (leadsRes.success) {
        setLeads(leadsRes.data);
        if (leadsRes.pagination) { setTotalPages(leadsRes.pagination.totalPages); setTotal(leadsRes.pagination.total); }
      }
      if (teamRes.success) setTeamMembers(teamRes.data);
    } catch { toast.error("Failed to load data."); }
    finally {
      setInitialLoading(false);
      setTableLoading(false);
    }
  }, [page, search, statusFilter, completionFilter, scope, memberFilter]);

  useEffect(() => { void fetchData(true); void fetchScopeCounts(); }, []);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => {
      setPage(1);
      pageRef.current = 1;
      const isTabOnly = scope !== prevScopeRef.current && search === "" && statusFilter === "ALL" && completionFilter === "ALL" && memberFilter === "";
      prevScopeRef.current = scope;
      void fetchData(true, 1, isTabOnly);
      if (!isTabOnly) void fetchScopeCounts();
    }, 300);
    return () => { if (filterTimerRef.current) clearTimeout(filterTimerRef.current); };
  }, [search, statusFilter, scope, memberFilter]);

  function handlePageChange(newPage: number) {
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    setPage(newPage);
    pageRef.current = newPage;
    void fetchData(false, newPage);
  }

  async function doAction(fn: () => Promise<void>, id?: string) {
    if (id) setBusy(id);
    try { await fn(); } finally { setBusy(null); }
  }

  async function distribute() {
    if (!assignTo || selected.size === 0) return;
    setDistributing(true);
    try {
      const r = await fetch("/api/team-leader/leads/distribute", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selected), userId: assignTo }),
      });
      const j = await r.json();
      if (j.success) { toast.success(j.message); setSelected(new Set()); setAssignTo(""); void fetchData(); void fetchScopeCounts(); }
      else toast.error(j.message);
    } catch { toast.error("Failed."); }
    finally { setDistributing(false); }
  }

  async function assignLead(leadId: string, userId: string) {
    const r = await fetch(`/api/team-leader/leads/${leadId}/assign`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const j = await r.json();
    if (j.success) { toast.success("Lead reassigned."); setActionLeadId(null); void fetchData(); void fetchScopeCounts(); }
    else toast.error(j.message);
  }

  async function unassignLead(leadId: string) {
    const r = await fetch(`/api/team-leader/leads/${leadId}/unassign`, { method: "PATCH", headers: { "Content-Type": "application/json" } });
    const j = await r.json();
    if (j.success) { toast.success("Lead unassigned."); setActionLeadId(null); void fetchData(); void fetchScopeCounts(); }
    else toast.error(j.message);
  }

  async function togglePriority(leadId: string) {
    const r = await fetch(`/api/team-leader/leads/${leadId}/priority`, { method: "PATCH" });
    const j = await r.json();
    if (j.success) { toast.success(j.message); setActionLeadId(null); void fetchData(); void fetchScopeCounts(); }
    else toast.error(j.message);
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function toggleAll() {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map((l) => l.id)));
  }

  const actionLead = leads.find((l) => l.id === actionLeadId);

  const startIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  if (initialLoading) {
    return (
    <div className={`space-y-4 ${selected.size > 0 ? "pb-44 lg:pb-4" : ""}`}>
        <div>
          <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-800" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-zinc-800/70" />
        </div>
        <div className="flex gap-0.5 rounded-xl border border-[#D4AF37]/20 bg-[#161616] p-0.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 flex-1 animate-pulse rounded-lg bg-white/[0.06]" />
          ))}
        </div>
        <div className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="h-5 w-5 shrink-0 animate-pulse rounded bg-white/[0.06]" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-32 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="h-3 w-48 animate-pulse rounded-lg bg-white/[0.04]" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.06]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${selected.size > 0 ? "pb-44 lg:pb-4" : ""}`}>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">Team Leads</h1>
        <p className="mt-2 text-sm text-zinc-400">Manage all leads across your team</p>
      </div>

      {/* Scope tabs — clear self vs team distinction */}
      <div className="flex gap-0.5 rounded-xl border border-[#D4AF37]/20 bg-[#161616] p-0.5">
        {[
          { key: "all" as const, label: "All", icon: <Users size={12} />, count: scopeCounts.all },
          { key: "self" as const, label: "My Leads", icon: <UserCircle size={12} />, count: scopeCounts.self },
          { key: "team" as const, label: "Team", icon: <Briefcase size={12} />, count: scopeCounts.team },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setScope(tab.key); setMemberFilter(""); setPage(1); }}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium transition-all ${
              scope === tab.key
                ? "bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/10"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${
              scope === tab.key ? "bg-black/20 text-black" : "bg-white/10 text-white/50"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, city..."
            className="w-full rounded-xl border border-white/[0.08] bg-black/40 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#D4AF37]/30 transition-colors"
          />
          {search && (
            <button onClick={() => { setSearch(""); searchRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X size={14} />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-all shrink-0 ${
            showFilters || statusFilter !== "ALL" || completionFilter !== "ALL" || memberFilter
              ? "border-[#D4AF37]/30 bg-[#D4AF37]/[0.08] text-[#D4AF37]"
              : "border-white/[0.08] bg-black/40 text-white/50"
          }`}>
          <Filter size={14} />
          {(statusFilter !== "ALL" || completionFilter !== "ALL" || memberFilter) && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37] text-[10px] font-bold text-black">
              {(statusFilter !== "ALL" ? 1 : 0) + (completionFilter !== "ALL" ? 1 : 0) + (memberFilter ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-4 space-y-3">
          {/* Completion filter */}
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">Completion</p>
            <div className="flex gap-1.5">
              {[
                { key: "ALL", label: "All" },
                { key: "INCOMPLETE", label: "Incomplete", color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/[0.08]" },
                { key: "COMPLETED", label: "Completed", color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/[0.08]" },
              ].map((c) => (
                <button key={c.key} onClick={() => { setCompletionFilter(c.key); setStatusFilter("ALL"); setPage(1); }}
                  className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-medium transition-all border ${
                    completionFilter === c.key
                      ? c.key === "ALL"
                        ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.12] text-[#D4AF37]"
                        : `${c.border} ${c.bg} ${c.color}`
                      : "border-white/[0.06] bg-white/[0.02] text-white/40"
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/[0.04]" />

          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Status</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {ALL_STATUSES.map((s) => {
              const active = statusFilter === s;
              const colors = STATUS_COLORS[s];
              return (
                <button key={s} onClick={() => { setStatusFilter(s); setCompletionFilter("ALL"); setPage(1); }}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium transition-all border ${
                    active ? (s === "ALL" ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.12] text-[#D4AF37]" : `${colors?.border} ${colors?.bg} ${colors?.text}`)
                      : "border-white/[0.06] bg-white/[0.02] text-white/40"
                  }`}>
                  {STATUS_LABELS[s] || s}
                </button>
              );
            })}
          </div>
          {scope === "all" && (
            <>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold pt-1">Assigned To</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                <button onClick={() => { setMemberFilter(""); setPage(1); }}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium transition-all border ${
                    !memberFilter ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.12] text-[#D4AF37]" : "border-white/[0.06] bg-white/[0.02] text-white/40"
                  }`}>All</button>
                <button onClick={() => { setMemberFilter("self"); setPage(1); }}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium transition-all border ${
                    memberFilter === "self" ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.12] text-[#D4AF37]" : "border-white/[0.06] bg-white/[0.02] text-white/40"
                  }`}>Self</button>
                {teamMembers.map((m) => (
                  <button key={m.id} onClick={() => { setMemberFilter(m.id); setPage(1); }}
                    className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium transition-all border ${
                      memberFilter === m.id ? "border-blue-500/30 bg-blue-500/[0.1] text-blue-400" : "border-white/[0.06] bg-white/[0.02] text-white/40"
                    }`}>{m.name}</button>
                ))}
              </div>
            </>
          )}
          {(statusFilter !== "ALL" || completionFilter !== "ALL" || memberFilter) && (
            <button onClick={() => { setStatusFilter("ALL"); setCompletionFilter("ALL"); setMemberFilter(""); setPage(1); }}
              className="flex items-center gap-1.5 text-[11px] text-[#D4AF37]/70 hover:text-[#D4AF37] pt-1">
              <RotateCcw size={11} /> Clear all
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar — desktop: inline card | mobile: sticky bottom */}
      {selected.size > 0 && (
        <>
          {/* Desktop: inline card */}
          <div className="hidden lg:block rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] px-4 py-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#D4AF37]">{selected.size} selected</span>
              <button onClick={() => setSelected(new Set())}
                className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white/50">
                <X size={12} />
              </button>
            </div>
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-xs text-white outline-none">
              <option value="">Assign to...</option>
              {teamMembers.filter((m) => m.isActive).map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m._count.leads})</option>
              ))}
            </select>
            <button onClick={() => { if (assignTo) setShowConfirm(true); }} disabled={!assignTo || distributing}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-40">
              {distributing ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpRight size={13} />}
              Distribute
            </button>
          </div>

          {/* Mobile: sticky bottom bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] border-t border-[#D4AF37]/25 bg-[#111]/95 backdrop-blur-xl px-4 py-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#D4AF37]">{selected.size} selected</span>
              <button onClick={() => setSelected(new Set())}
                className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white/50">
                <X size={12} />
              </button>
            </div>
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-xs text-white outline-none">
              <option value="">Assign to...</option>
              {teamMembers.filter((m) => m.isActive).map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m._count.leads})</option>
              ))}
            </select>
            <button onClick={() => { if (assignTo) setShowConfirm(true); }} disabled={!assignTo || distributing}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-40">
              {distributing ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpRight size={13} />}
              Distribute
            </button>
          </div>
        </>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => setShowConfirm(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111] p-5 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                <ArrowUpRight size={18} className="text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Confirm Distribution</p>
                <p className="text-[11px] text-white/40 mt-0.5">This action will reassign the selected leads.</p>
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 space-y-1">
              <p className="text-xs text-white/50">
                <span className="text-[#D4AF37] font-medium">{selected.size} lead{selected.size > 1 ? "s" : ""}</span> will be assigned to
              </p>
              <p className="text-sm font-medium text-white">
                {teamMembers.find((m) => m.id === assignTo)?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/60 hover:text-white/80 transition-all">
                Cancel
              </button>
              <button onClick={() => { setShowConfirm(false); distribute(); }}
                disabled={distributing}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-40">
                {distributing ? <Loader2 size={12} className="animate-spin" /> : <ArrowUpRight size={12} />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leads */}
      <div className="relative">
        {tableLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#161616]/80">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Loader2 size={14} className="animate-spin text-[#D4AF37]" />
              Loading...
            </div>
          </div>
        )}
      {leads.length === 0 && !tableLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4">
            <Users size={28} className="text-white/15" />
          </div>
          <p className="text-white/40 text-sm">No leads found</p>
          <p className="text-white/20 text-xs mt-1">
            {search || statusFilter !== "ALL" || memberFilter || scope !== "all" ? "Try adjusting filters" : "Leads will appear here"}
          </p>
        </div>
      ) : (
        <>
          {/* Select all + count */}
          <div className="flex items-center gap-3 px-1 pb-2 pt-1">
            <button onClick={toggleAll}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                selected.size === leads.length && leads.length > 0 ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/15"
              }`}>
              {selected.size === leads.length && leads.length > 0 && <CheckCircle2 size={12} />}
            </button>
            <span className="text-[11px] text-white/30">
              {selected.size > 0 ? `${selected.size} selected` : `Showing ${startIndex}-${endIndex} of ${total} leads`}
            </span>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-[#161616] lg:block">
            <table className="w-full">
              <thead className="border-b border-[#D4AF37]/20 bg-[#111111]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={toggleAll}
                      className={`flex h-5 w-5 items-center justify-center rounded border transition-all ${
                        selected.size === leads.length && leads.length > 0 ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/15"
                      }`}>
                      {selected.size === leads.length && leads.length > 0 && <CheckCircle2 size={10} />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">City</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Follow Ups</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const sc = STATUS_COLORS[lead.status] || STATUS_COLORS.NEW;
                  const isSelected = selected.has(lead.id);
                  const isBusy = busy === lead.id;
                  const isSelf = !lead.assignedTo;

                  return (
                    <tr key={lead.id}
                      onClick={() => setDetailLeadId(lead.id)}
                      className={`border-b border-[#D4AF37]/10 transition cursor-pointer hover:bg-[#D4AF37]/5 ${isSelected ? "bg-[#D4AF37]/[0.05]" : ""}`}>
                      <td className="px-4 py-3">
                        <button onClick={(e) => toggleSelect(lead.id, e)}
                          className={`flex h-5 w-5 items-center justify-center rounded border transition-all ${
                            isSelected ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/15"
                          }`}>
                          {isSelected && <CheckCircle2 size={10} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-white truncate max-w-[160px]">{lead.name || "Unknown"}</span>
                          {lead.isPriority && <Star size={12} className="shrink-0 text-[#D4AF37]" fill="currentColor" />}
                          {isSelf && (
                            <span className="shrink-0 inline-flex items-center rounded border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                              Mine
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                          <Phone size={12} />
                          {lead.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{lead.city || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sc.bg} ${sc.border} ${sc.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {lead.followUpCount > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-orange-400/60">
                            <Clock size={11} />{lead.followUpCount}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.assignedTo ? (
                          <span className="flex items-center gap-1 text-xs text-blue-400/50">
                            <User size={11} />{lead.assignedTo.name}
                          </span>
                        ) : (
                          <span className="text-xs text-[#D4AF37]/40">Self</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/30">{formatDateShort(lead.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={(e) => { e.stopPropagation(); setDetailLeadId(lead.id); }}
                            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-medium text-white/40 transition hover:border-[#D4AF37]/30 hover:text-[#D4AF37]">
                            View
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setActionLeadId(lead.id); }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/30 transition hover:border-[#D4AF37]/30 hover:text-[#D4AF37]">
                            {isBusy ? <Loader2 size={12} className="animate-spin" /> : <MoreVertical size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile compact list */}
          <div className="space-y-1.5 lg:hidden">
            {leads.map((lead) => {
              const sc = STATUS_COLORS[lead.status] || STATUS_COLORS.NEW;
              const isSelected = selected.has(lead.id);
              const isBusy = busy === lead.id;
              const isSelf = !lead.assignedTo;

              return (
                <div key={lead.id}
                  onClick={() => setDetailLeadId(lead.id)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-all active:scale-[0.99] ${
                    isSelected ? "border-[#D4AF37]/30 bg-[#D4AF37]/[0.05]"
                      : isSelf
                        ? "border-[#D4AF37]/15 bg-[#D4AF37]/[0.03]"
                        : "border-white/[0.06] bg-white/[0.02]"
                  }`}>
                  <button onClick={(e) => toggleSelect(lead.id, e)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
                      isSelected ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/15"
                    }`}>
                    {isSelected && <CheckCircle2 size={9} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-white truncate">{lead.name || "Unknown"}</p>
                      {lead.isPriority && <Star size={11} className="shrink-0 text-[#D4AF37]" fill="currentColor" />}
                      {isSelf && (
                        <span className="shrink-0 inline-flex items-center rounded border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                          Mine
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-white/35 mt-0.5">
                      <span className="flex items-center gap-1"><Phone size={9} />{lead.phone}</span>
                      {lead.assignedTo && <span className="flex items-center gap-1 text-blue-400/50"><User size={9} />{lead.assignedTo.name}</span>}
                      {!lead.assignedTo && <span className="flex items-center gap-1 text-[#D4AF37]/40"><User size={9} />Self</span>}
                      {lead.city && <span className="flex items-center gap-1"><MapPin size={9} />{lead.city}</span>}
                      {lead.followUpCount > 0 && <span className="flex items-center gap-1 text-orange-400/50"><Clock size={9} />{lead.followUpCount}</span>}
                      <span className="flex items-center gap-1"><Calendar size={9} />{formatDateShort(lead.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${sc.bg} ${sc.border} ${sc.text}`}>
                      <span className={`h-1 w-1 rounded-full ${sc.dot}`} />
                      {STATUS_LABELS[lead.status]}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); setActionLeadId(lead.id); }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30">
                      {isBusy ? <Loader2 size={12} className="animate-spin" /> : <MoreVertical size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div
              className="
              flex
              w-full
              flex-col
              items-center
              justify-between
              gap-2
              rounded-xl
              border
              border-[#D4AF37]/20
              bg-[#161616]
              px-4
              py-2.5
              mt-2
              sm:flex-row
              sm:px-5
              sm:py-3
              sm:mt-3
              "
            >
              <p className="text-[11px] text-zinc-400">
                <span className="text-white">{startIndex}</span>-
                <span className="text-white">{endIndex}</span> of{" "}
                <span className="text-white">{total}</span>
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-[#D4AF37]/20
                  text-zinc-300
                  transition
                  hover:border-[#D4AF37]/50
                  hover:text-[#D4AF37]
                  disabled:cursor-not-allowed
                  disabled:opacity-30
                  disabled:hover:border-[#D4AF37]/20
                  disabled:hover:text-zinc-300
                  "
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>

                <span className="min-w-[60px] text-center text-[11px] text-zinc-400">
                  <span className="text-white">{page}</span>/{totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-[#D4AF37]/20
                  text-zinc-300
                  transition
                  hover:border-[#D4AF37]/50
                  hover:text-[#D4AF37]
                  disabled:cursor-not-allowed
                  disabled:opacity-30
                  disabled:hover:border-[#D4AF37]/20
                  disabled:hover:text-zinc-300
                  "
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {/* Bottom sheet: Lead Actions */}
      {actionLead && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" onClick={() => setActionLeadId(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#111] rounded-t-3xl sm:rounded-2xl border-t border-white/[0.08] p-5 pb-8 sm:pb-5 space-y-4 animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center sm:hidden"><div className="h-1 w-10 rounded-full bg-white/20" /></div>

            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white truncate">{actionLead.name || "Unknown"}</p>
                  {!actionLead.assignedTo && (
                    <span className="shrink-0 inline-flex items-center rounded-md border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                      Mine
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/30 mt-0.5">{actionLead.phone}</p>
              </div>
              <button onClick={() => setActionLeadId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40 shrink-0">
                <X size={16} />
              </button>
            </div>

            <div className="h-px bg-white/[0.06]" />

            <button onClick={() => togglePriority(actionLead.id)}
              className="w-full flex items-center gap-3 rounded-xl border border-white/[0.06] px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-sm text-white/60 active:bg-white/[0.05] transition-all">
              <Star size={15} className={actionLead.isPriority ? "text-[#D4AF37]" : "text-white/30"} fill={actionLead.isPriority ? "currentColor" : "none"} />
              {actionLead.isPriority ? "Remove Priority" : "Mark as Priority"}
            </button>

            <button onClick={() => { setActionLeadId(null); setDetailLeadId(actionLead.id); }}
              className="w-full flex items-center gap-3 rounded-xl border border-white/[0.06] px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-sm text-white/60 active:bg-white/[0.05] transition-all">
              <Eye size={15} className="text-white/30" />
              View Full Details
            </button>

            <div className="h-px bg-white/[0.06]" />

            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Assign To</p>
              <div className="space-y-1.5">
                {actionLead.assignedTo && (
                  <button onClick={() => doAction(() => unassignLead(actionLead.id), actionLead.id)}
                    className="w-full flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-sm text-orange-400 active:bg-orange-500/10 transition-all">
                    <UserMinus size={14} />
                    Take back to me
                    {busy === actionLead.id && <Loader2 size={12} className="animate-spin ml-auto" />}
                  </button>
                )}
                {teamMembers.filter((m) => m.isActive && m.id !== actionLead.assignedTo?.id).map((m) => (
                  <button key={m.id} onClick={() => doAction(() => assignLead(actionLead.id, m.id), actionLead.id)}
                    className="w-full flex items-center justify-between rounded-xl border border-white/[0.06] px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-sm text-white/60 active:bg-white/[0.05] transition-all">
                    <div className="flex items-center gap-2">
                      <UserCheck size={14} className="text-blue-400/60" />
                      {m.name}
                    </div>
                    <span className="text-[10px] text-white/25 bg-white/5 rounded-md px-1.5 py-0.5">{m._count.leads}</span>
                    {busy === actionLead.id && <Loader2 size={12} className="animate-spin" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Panel */}
      {detailLeadId && (
        <TeamLeadDetailPanel
          leadId={detailLeadId}
          onClose={() => { setDetailLeadId(null); void fetchData(); }}
        />
      )}
    </div>
  );
}
