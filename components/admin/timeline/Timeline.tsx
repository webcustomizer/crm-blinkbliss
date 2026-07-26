"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import ActivityMessage from "@/components/admin/activity/ActivityMessage";

interface User {
  id: string;
  name: string;
  role: string;
}

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user: { id: string; name: string; role: string };
  lead?: { id: string; name: string | null; phone: string } | null;
  metadata?: any;
}

export default function Timeline() {
  const router = useRouter();
  const sp = useSearchParams();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const page = Number(sp.get("page") || 1);
  const leadId = sp.get("leadId") || "";
  const userId = sp.get("userId") || "";
  const action = sp.get("action") || "";
  const startDate = sp.get("startDate") || "";
  const endDate = sp.get("endDate") || "";

  const [leadSearch, setLeadSearch] = useState(leadId);
  const [userSearch, setUserSearch] = useState(userId);
  const [actionSearch, setActionSearch] = useState(action);
  const [startDateSearch, setStartDateSearch] = useState(startDate);
  const [endDateSearch, setEndDateSearch] = useState(endDate);

  useEffect(() => {
    fetch("/api/admin/users?role=all", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setUsers(j.data); })
      .catch(() => {});
  }, []);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (leadId) params.set("leadId", leadId);
      if (userId) params.set("userId", userId);
      if (action) params.set("action", action);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/timeline?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setActivities(json.data);
        setTotal(json.pagination.total);
        setTotalPages(json.pagination.totalPages);
      }
    } catch {}
    setLoading(false);
  }, [page, leadId, userId, action, startDate, endDate]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  function applyFilters() {
    const params = new URLSearchParams();
    if (leadSearch) params.set("leadId", leadSearch);
    if (userSearch) params.set("userId", userSearch);
    if (actionSearch) params.set("action", actionSearch);
    if (startDateSearch) params.set("startDate", startDateSearch);
    if (endDateSearch) params.set("endDate", endDateSearch);
    params.set("page", "1");
    router.replace(`/admin/timeline?${params}`);
  }

  function clearFilters() {
    setLeadSearch("");
    setUserSearch("");
    setActionSearch("");
    setStartDateSearch("");
    setEndDateSearch("");
    router.replace("/admin/timeline");
  }

  function goPage(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    router.replace(`/admin/timeline?${params}`);
  }

  const hasFilters = leadId || userId || action || startDate || endDate;

  const ACTION_OPTIONS = [
    "LOGIN", "LOGOUT", "LEAD_UPDATED", "STATUS_CHANGED",
    "FOLLOWUP_COMPLETED", "REMARK_UPDATED", "ANNOUNCEMENT_CREATED",
    "PASSWORD_CHANGED", "LEAD_BULK_ACTION", "MESSAGE_SENT",
    "FORCE_LOGOUT", "LEAD_MERGED", "LEAD_SOFT_DELETED", "LEAD_RESTORED",
    "PASSWORD_FAILED", "SESSION_EXPIRED", "TWO_FACTOR_ENABLED",
    "TWO_FACTOR_DISABLED", "TWO_FACTOR_CODE_SENT",
    "GROUP_CHAT_ENABLED", "GROUP_CHAT_DISABLED",
    "USER_STATUS_CHANGED", "BACKUP_CREATED",
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#111111] p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Filters</h2>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white">
              <X size={14} /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Lead ID</label>
            <input value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)}
              placeholder="Search by lead ID"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">User</label>
            <select value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/50"
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Action</label>
            <select value={actionSearch} onChange={(e) => setActionSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/50"
            >
              <option value="">All Actions</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
            <input type="date" value={startDateSearch} onChange={(e) => setStartDateSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">End Date</label>
            <input type="date" value={endDateSearch} onChange={(e) => setEndDateSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/50"
            />
          </div>
        </div>
        <button onClick={applyFilters}
          className="mt-4 flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2 text-sm font-semibold text-black hover:bg-[#e6c04a]"
        >
          <Search size={16} /> Apply Filters
        </button>
      </div>

      {/* Results */}
      <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#111111] p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Timeline</h2>
            <p className="text-xs text-zinc-500">{total} total entries</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-400">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">No activity found.</div>
        ) : (
          <div>
            {activities.map((a, i) => (
              <ActivityMessage key={a.id} activity={a} isLast={i === activities.length - 1} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#111111] px-4 py-3">
          <button onClick={() => goPage(page - 1)} disabled={page <= 1}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 disabled:opacity-30 hover:text-white"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-400">
            Page {page} of {totalPages}
          </span>
          <button onClick={() => goPage(page + 1)} disabled={page >= totalPages}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 disabled:opacity-30 hover:text-white"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
