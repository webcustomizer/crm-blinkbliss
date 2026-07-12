"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
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

  async function getLeads() {
    try {
      if (!hasLoaded) {
        setInitialLoading(true);
      } else {
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
  }

  useEffect(() => {
    if (dashboardFilter) {
      setFilter(dashboardFilter);
    }
  }, [dashboardFilter]);

  useEffect(() => {
    getLeads();
  }, [page, filter, search, salespersonId]);

  // realtime updates using supabase
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
        () => {
          getLeads();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

      getLeads();
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
        p-10
        text-center
        text-gray-400
      "
      >
        Loading leads...
      </div>
    );
  }
  return (
    <div
      className="
      overflow-hidden
      rounded-2xl
      border
      border-[#D4AF37]/20
      bg-[#111111]
      shadow-xl
      "
    >
      {/* TOP FILTER BAR */}

      <div
        className="
        flex
        flex-wrap
        items-center
        gap-3
        p-5
        "
      >
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
              transition-all

              ${
                filter === value
                  ? "border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]"
                  : "border-white/10 text-gray-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
              }
            `}
          >
            {label}
          </button>
        ))}

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
          border-[#D4AF37]/30
          bg-black
          px-4
          py-2.5
          text-sm
          text-white
          outline-none
          transition
          hover:border-[#D4AF37]
          focus:border-[#D4AF37]
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

        <input
          value={search}
          onChange={(e) => {
            setPage(1);

            setSearch(e.target.value);
          }}
          placeholder="Search name or phone..."
          className="
          ml-auto
          rounded-xl
          border
          border-[#D4AF37]/30
          bg-black
          px-4
          py-2.5
          text-sm
          text-white
          outline-none
          placeholder:text-gray-500
          focus:border-[#D4AF37]
          "
        />
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
      rounded-xl
      border
      border-[#D4AF37]/20
      bg-[#111111]
      px-6
      py-3
      text-sm
      font-medium
      text-[#D4AF37]
      shadow-xl
      "
            >
              Updating leads...
            </div>
          </div>
        )}
        <div className="mb-5 flex justify-end px-5">
          <LeadDialog onLeadCreated={getLeads} />
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
              mt-2
              text-sm
              text-gray-400
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
              border-[#D4AF37]/20
              bg-black/40
              text-[#D4AF37]
              "
              >
                <th className="p-4 text-left">Name</th>

                <th className="p-4 text-left">Phone</th>

                <th className="p-4 text-left">City</th>

                <th className="p-4 text-left">Employment</th>

                <th className="p-4 text-left">Purpose</th>

                <th className="p-4 text-left">Status</th>

                <th className="p-4 text-left">Assigned</th>

                <th className="p-4 text-left">Action</th>
              </tr>
            </thead>

            <tbody
              className={`
  transition-opacity
  duration-200
  ${refreshing ? "opacity-40" : "opacity-100"}
  `}
            >
              {data.map((lead) => (
                <tr
                  key={lead.id}
                  className="
              border-b
              border-white/5
              text-gray-200
              transition
              hover:bg-[#D4AF37]/5
              "
                >
                  <td className="p-4 text-white font-medium">
                    {lead.name || "-"}
                  </td>

                  <td className="p-4">{lead.phone}</td>

                  <td className="p-4">{lead.city || "-"}</td>

                  <td className="p-4">{lead.currentStatus || "-"}</td>

                  <td className="p-4">{lead.purpose || "-"}</td>

                  <td className="p-4">
                    <span
                      className={`
                  inline-flex
                  rounded-full
                  border
                  px-3
                  py-1
                  text-xs
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
                  border-[#D4AF37]/30
                  bg-black
                  px-3
                  py-2
                  text-white
                  outline-none
                  hover:border-[#D4AF37]
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
                    <LeadDetailsDialog leadId={lead.id} onUpdate={getLeads} />
                  </td>
                </tr>
              ))}
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
          "
        >
          <p
            className="
          text-sm
          text-gray-400
          "
          >
            Page {pagination.page} of {pagination.totalPages}
          </p>

          <div className="flex gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="
              rounded-lg
              border
              border-[#D4AF37]/30
              px-4
              py-2
              text-white
              disabled:opacity-40
              "
            >
              Previous
            </button>

            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="
              rounded-lg
              border
              border-[#D4AF37]/30
              px-4
              py-2
              text-white
              disabled:opacity-40
              "
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
