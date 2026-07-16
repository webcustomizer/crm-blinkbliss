"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, ListFilter } from "lucide-react";
import { supabase } from "@/lib/supabase";

import LeadDetailsDialog from "./LeadDetailsDialog";
import LeadDialog from "./LeadDialog";

type Lead = {
  id: string;
  name: string | null;
  phone: string;
  city: string | null;
  currentStatus: string | null;
  purpose: string | null;
  status: string;
  completion: string;

  assignedTo?: {
    id: string;
    name: string;
  } | null;
};

type Salesperson = {
  id: string;
  name: string;
};

interface Props {
  salespersons: Salesperson[];
}

export default function LeadsTable({ salespersons }: Props) {
  const searchParams = useSearchParams();

  const dashboardFilter = searchParams.get("filter");

  const [data, setData] = useState<Lead[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState(dashboardFilter || "ALL");

  const [salespersonId, setSalespersonId] = useState("");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [limit] = useState(10);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  // Row IDs that are currently being synced via realtime — used to show
  // a subtle per-row indicator instead of blurring/reloading the whole table.
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const markUpdating = useCallback((id: string) => {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const unmarkUpdating = useCallback((id: string) => {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getLeads = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (!hasLoaded) {
          setInitialLoading(true);
        } else if (!opts?.silent) {
          setRefreshing(true);
        }

        const res = await fetch(
          `/api/admin/leads?page=${page}&limit=${limit}&search=${search}&filter=${filter}&salespersonId=${salespersonId}`,
          {
            cache: "no-store",
          },
        );

        const result = await res.json();

        setData(result.data || []);

        setPagination(
          result.pagination || {
            page: 1,
            totalPages: 1,
            total: 0,
          },
        );
      } catch {
        toast.error("Failed to load leads.");
      } finally {
        setInitialLoading(false);

        setRefreshing(false);

        setHasLoaded(true);
      }
    },
    [hasLoaded, page, limit, search, filter, salespersonId],
  );

  useEffect(() => {
    if (!dashboardFilter) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFilter(dashboardFilter);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dashboardFilter]);

  const getLeadsRef = useRef(getLeads);
  useEffect(() => {
    getLeadsRef.current = getLeads;
  });

  // Realtime: patch the specific row instead of refetching/blurring
  // the entire table on every change.
  useEffect(() => {
    const channel = supabase
      .channel("lead-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Lead",
        },
        (payload) => {
          const eventType = payload.eventType;
          const newRow = payload.new as Record<string, any> | null;
          const oldRow = payload.old as Record<string, any> | null;

          if (eventType === "DELETE") {
            const id = oldRow?.id;
            if (!id) return;

            markUpdating(id);

            // small delay so the row can visually fade before it disappears
            setTimeout(() => {
              setData((prev) => prev.filter((l) => l.id !== id));
              unmarkUpdating(id);
            }, 250);

            return;
          }

          if (eventType === "INSERT") {
            // We can't know client-side whether this new lead matches the
            // current filter/page, so just quietly resync in the background
            // (no overlay, no blur).
            getLeadsRef.current?.({ silent: true });
            return;
          }

          if (eventType === "UPDATE") {
            const id = newRow?.id;
            if (!id) return;

            setData((prev) => {
              const exists = prev.some((l) => l.id === id);
              if (!exists) return prev; // not on this page/filter, ignore

              return prev.map((l) => {
                if (l.id !== id) return l;

                const assignedToChanged =
                  newRow.assignedToId !== (l.assignedTo?.id ?? null);

                const resolvedAssignedTo = assignedToChanged
                  ? salespersons.find((p) => p.id === newRow.assignedToId) ||
                    null
                  : l.assignedTo;

                return {
                  ...l,
                  name: newRow.name ?? l.name,
                  phone: newRow.phone ?? l.phone,
                  city: newRow.city ?? l.city,
                  currentStatus: newRow.currentStatus ?? l.currentStatus,
                  purpose: newRow.purpose ?? l.purpose,
                  status: newRow.status ?? l.status,
                  assignedTo: newRow.assignedToId
                    ? resolvedAssignedTo
                      ? {
                          id: resolvedAssignedTo.id,
                          name: resolvedAssignedTo.name,
                        }
                      : l.assignedTo
                    : null,
                };
              });
            });

            markUpdating(id);
            setTimeout(() => unmarkUpdating(id), 700);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [salespersons, markUpdating, unmarkUpdating]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      void Promise.resolve().then(() => getLeads());
      return;
    }

    const timer = setTimeout(() => {
      void Promise.resolve().then(() => getLeads());
    }, 400);

    return () => clearTimeout(timer);
  }, [getLeads]);

  async function assignLead(leadId: string, salespersonId: string) {
    try {
      const response = await fetch(`/api/admin/leads/${leadId}/assign`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          salespersonId,
        }),
      });

      if (!response.ok) {
        throw new Error();
      }

      toast.success(
        salespersonId
          ? "Lead assigned successfully."
          : "Lead unassigned successfully.",
      );

      // No manual getLeads() call needed here — the realtime UPDATE
      // handler above will patch this row directly.
    } catch {
      toast.error("Failed to assign lead.");
    }
  }

  function statusStyle(status: string) {
    switch (status) {
      case "JOINED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

      case "DEAD":
        return "bg-red-500/10 text-red-400 border-red-500/20";

      case "CALLED":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";

      case "SEAT_RESERVED":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";

      case "TRAINING_ATTENDED":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";

      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  }

  const filters = [
    ["ALL", "All"],

    ["TODAY_FOLLOW_UP", "Today's Follow Ups"],

    ["OVERDUE_FOLLOW_UP", "Overdue Follow Ups"],

    ["INCOMPLETE", "Incomplete"],

    ["UNASSIGNED", "Unassigned"],

    ["NEW", "New"],

    ["CALLED", "Called"],

    ["NEED_MORE_FOLLOW_UP", "Follow Up"],

    ["TRAINING_ATTENDED", "Training"],

    ["SEAT_RESERVED", "Reserved"],

    ["JOINED", "Joined"],

    ["DEAD", "Dead"],
  ];

  if (initialLoading) {
    return (
      <div
        className="
        flex
        min-h-[340px]
        flex-col
        items-center
        justify-center
        gap-3
        rounded-[28px]
        border
        border-[#D4AF37]/15
        bg-gradient-to-br
        from-[#171717]
        to-[#0d0d0d]
      "
      >
        <div
          className="
          h-8
          w-8
          animate-spin
          rounded-full
          border-2
          border-[#D4AF37]/20
          border-t-[#D4AF37]
          "
        />
        <p className="text-sm text-white/40">Loading leads…</p>
      </div>
    );
  }
  return (
    <div
      className="
      relative
      overflow-hidden
      rounded-[28px]
      border
      border-[#D4AF37]/20
      bg-gradient-to-br
      from-[#171717]
      to-[#0d0d0d]
      shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]
      "
    >
      {/* ambient glow */}
      <div
        aria-hidden
        className="
        pointer-events-none
        absolute
        -right-20
        -top-24
        h-64
        w-64
        rounded-full
        bg-[#D4AF37]/10
        blur-[90px]
        "
      />

      {/* TOP FILTER BAR */}

      <div
        className="
        relative
        flex
        flex-col
        gap-4
        border-b
        border-white/10
        p-6
        sm:p-7
        "
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {filters.map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setPage(1);
                setFilter(value);
              }}
              className={`
                rounded-xl
                border
                px-4
                py-2
                text-sm
                font-medium
                transition-all

                ${
                  filter === value
                    ? "border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#D4AF37]"
                    : "border-white/10 text-white/50 hover:border-[#D4AF37]/30 hover:text-white"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* SALESPERSON FILTER */}

          <select
            value={salespersonId}
            onChange={(e) => {
              setPage(1);

              setSalespersonId(e.target.value);
            }}
            className="
            cursor-pointer
            rounded-xl
            border
            border-white/10
            bg-black/30
            px-4
            py-2.5
            text-sm
            text-white
            outline-none
            transition-colors
            hover:border-[#D4AF37]/40
            focus:border-[#D4AF37]/60
            "
          >
            <option value="">All Salespersons</option>

            {salespersons.map((person) => (
              <option
                key={person.id}
                value={person.id}
                className="
                bg-[#111111]
                text-white
                "
              >
                {person.name}
              </option>
            ))}
          </select>

          {/* SEARCH */}

          <div className="relative sm:ml-auto sm:w-80">
            <Search
              size={16}
              className="
              pointer-events-none
              absolute
              left-3.5
              top-1/2
              -translate-y-1/2
              text-white/30
              "
            />

            <input
              value={search}
              onChange={(e) => {
                setPage(1);

                setSearch(e.target.value);
              }}
              placeholder="Search name or phone…"
              className="
              w-full
              rounded-xl
              border
              border-white/10
              bg-black/30
              py-2.5
              pl-10
              pr-4
              text-sm
              text-white
              outline-none
              transition-colors
              placeholder:text-white/30
              focus:border-[#D4AF37]/60
              "
            />
          </div>
        </div>
      </div>

      {/* TABLE */}

      <div className="relative overflow-x-auto">
        {refreshing && (
          <div
            className="
    absolute
    inset-0
    z-20
    flex
    items-center
    justify-center
    bg-black/40
    backdrop-blur-sm
    "
          >
            <div
              className="
      flex
      items-center
      gap-2.5
      rounded-2xl
      border
      border-[#D4AF37]/25
      bg-[#111]/90
      px-5
      py-2.5
      text-sm
      font-medium
      text-[#D4AF37]
      shadow-xl
      "
            >
              <span
                className="
                h-3.5
                w-3.5
                animate-spin
                rounded-full
                border-2
                border-[#D4AF37]/25
                border-t-[#D4AF37]
                "
              />
              Updating leads…
            </div>
          </div>
        )}

        <div className="flex justify-end px-6 py-5 sm:px-7">
          <LeadDialog onLeadCreated={() => getLeads()} />
        </div>

        {data.length === 0 ? (
          <div
            className="
            p-16
            text-center
            "
          >
            <p
              className="
              text-lg
              font-semibold
              text-white
              "
            >
              No leads found.
            </p>

            <p
              className="
              mt-1.5
              text-sm
              text-white/40
              "
            >
              Try changing filters or selecting another salesperson.
            </p>
          </div>
        ) : (
          <table
            className={`
  w-full
  text-sm
  transition-opacity
  duration-200
  `}
          >
            <thead>
              <tr
                className="
              border-b
              border-white/10
              bg-black/20
              "
              >
                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Name
                </th>

                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Phone
                </th>

                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  City
                </th>

                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Employment
                </th>

                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Purpose
                </th>

                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Status
                </th>

                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Assigned
                </th>

                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                  Action
                </th>
              </tr>
            </thead>

            <tbody
              className={`
  transition-opacity
  duration-200
  ${refreshing ? "opacity-40" : "opacity-100"}
  `}
            >
              {data.map((lead) => {
                const isUpdating = updatingIds.has(lead.id);

                return (
                  <tr
                    key={lead.id}
                    className={`
                border-b
                border-white/5
                text-white/70
                transition-colors
                duration-500
                hover:bg-[#D4AF37]/[0.04]
                ${isUpdating ? "bg-[#D4AF37]/[0.07]" : ""}
                `}
                  >
                    <td className="p-4 font-medium text-white">
                      <span className="inline-flex items-center gap-2">
                        {lead.name || "—"}

                        {isUpdating && (
                          <span
                            className="
                            h-2
                            w-2
                            shrink-0
                            animate-pulse
                            rounded-full
                            bg-[#D4AF37]
                            "
                            title="Updating…"
                          />
                        )}
                      </span>
                    </td>

                    <td className="p-4">{lead.phone}</td>

                    <td className="p-4">{lead.city || "—"}</td>

                    <td className="p-4">{lead.currentStatus || "—"}</td>

                    <td className="p-4">{lead.purpose || "—"}</td>

                    <td className="p-4">
                      <span
                        className={`
                    inline-flex
                    rounded-full
                    border
                    px-3
                    py-1
                    text-xs
                    font-medium
                    ${statusStyle(lead.status)}
                    `}
                      >
                        {lead.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="p-4">
                      <select
                        value={lead.assignedTo?.id || ""}
                        onChange={(e) => assignLead(lead.id, e.target.value)}
                        className="
                    cursor-pointer
                    rounded-lg
                    border
                    border-white/10
                    bg-black/30
                    px-3
                    py-2
                    text-white
                    outline-none
                    transition-colors
                    hover:border-[#D4AF37]/40
                    focus:border-[#D4AF37]/60
                    "
                      >
                        <option value="">Select</option>

                        {salespersons.map((person) => (
                          <option
                            key={person.id}
                            value={person.id}
                            className="
                        bg-[#111111]
                        "
                          >
                            {person.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-4">
                      <LeadDetailsDialog
                        leadId={lead.id}
                        onUpdate={() => getLeads()}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* PAGINATION */}

        <div
          className="
          flex
          items-center
          justify-between
          border-t
          border-white/10
          p-5
          sm:p-6
          "
        >
          <p
            className="
          text-sm
          text-white/40
          "
          >
            Page {pagination.page} of {pagination.totalPages}
          </p>

          <div className="flex gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="
              flex
              items-center
              gap-1.5
              rounded-xl
              border
              border-white/10
              px-4
              py-2
              text-sm
              font-medium
              text-white
              transition-colors
              hover:border-[#D4AF37]/40
              hover:bg-[#D4AF37]/[0.06]
              disabled:pointer-events-none
              disabled:opacity-30
              "
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="
              flex
              items-center
              gap-1.5
              rounded-xl
              border
              border-white/10
              px-4
              py-2
              text-sm
              font-medium
              text-white
              transition-colors
              hover:border-[#D4AF37]/40
              hover:bg-[#D4AF37]/[0.06]
              disabled:pointer-events-none
              disabled:opacity-30
              "
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
