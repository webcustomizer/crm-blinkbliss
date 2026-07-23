"use client";

import { Phone, CalendarClock, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import LeadStatusBadge from "./LeadStatusBadge";
import { prefetchLead } from "@/lib/leadCache";
import { formatDate, formatDateTime, formatTime, formatDateShort } from "@/lib/format-date";

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

interface LeadsTableProps {
  leads: Lead[];
  onView: (lead: Lead) => void;
  total: number;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
}

function PriorityBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md border border-red-500/20 bg-red-500/15 px-2 py-0.5 text-[11px] font-medium leading-none text-red-400">
      Priority
    </span>
  );
}

export default function LeadsTable({
  leads,
  onView,
  total,
  totalPages,
  currentPage,
  onPageChange,
  pageSize,
}: LeadsTableProps) {
  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);

  function goToPage(page: number) {
    onPageChange(Math.min(Math.max(page, 1), totalPages));
  }

  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div
        className="
        hidden
        overflow-hidden
        rounded-2xl
        border
        border-[#D4AF37]/20
        bg-[#161616]
        lg:block
        "
      >
        <table className="w-full">
          <thead className="border-b border-[#D4AF37]/20 bg-[#111111]">
            <tr>
              <th className="px-5 py-4 text-left text-xs font-medium text-zinc-400">
                Lead
              </th>
              <th className="px-5 py-4 text-left text-xs font-medium text-zinc-400">
                Phone
              </th>
              <th className="px-5 py-4 text-left text-xs font-medium text-zinc-400">
                City
              </th>
              <th className="px-5 py-4 text-left text-xs font-medium text-zinc-400">
                Status
              </th>
              <th className="px-5 py-4 text-left text-xs font-medium text-zinc-400">
                Follow Up
              </th>
              <th className="px-5 py-4 text-left text-xs font-medium text-zinc-400">
                Created
              </th>
              <th className="px-5 py-4 text-right text-xs font-medium text-zinc-400">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-sm text-zinc-500"
                >
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  onPointerDown={() => prefetchLead(lead.id)}
                  className="border-b border-[#D4AF37]/10 transition hover:bg-[#D4AF37]/5"
                >
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {lead.name || "Unknown"}
                      </p>
                      {lead.isPriority && <PriorityBadge />}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <Phone size={14} />
                      {lead.phone}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-zinc-400">
                    {lead.city || "-"}
                  </td>

                  <td className="px-5 py-4">
                    <LeadStatusBadge status={lead.status} />
                  </td>

                  <td className="px-5 py-4">
                    {lead.nextFollowUp ? (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <CalendarClock size={14} />
                        {formatDate(lead.nextFollowUp)}
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-500">-</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Calendar size={14} />
                      {formatDateShort(lead.createdAt)}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        prefetchLead(lead.id);
                      }}
                      onClick={() => onView(lead)}
                      className="
                      rounded-xl
                      border
                      border-[#D4AF37]/30
                      px-4
                      py-2
                      text-xs
                      font-medium
                      text-[#D4AF37]
                      transition
                      hover:bg-[#D4AF37]
                      hover:text-black
                      "
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#161616] px-5 py-10 text-center text-sm text-zinc-500">
            No leads found
          </div>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              onPointerDown={() => prefetchLead(lead.id)}
              className="rounded-2xl border border-[#D4AF37]/20 bg-[#161616] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <Calendar size={10} />
                    {formatDateShort(lead.createdAt)}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-white">
                      {lead.name || "Unknown"}
                    </p>
                    {lead.isPriority && <PriorityBadge />}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-zinc-300">
                    <Phone size={13} />
                    {lead.phone}
                  </div>
                </div>
                <LeadStatusBadge status={lead.status} />
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#D4AF37]/10 pt-2.5">
                <span className="truncate text-xs text-zinc-400">{lead.city || "-"}</span>

                <span className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-400">
                  <CalendarClock size={12} className={lead.nextFollowUp ? "text-[#D4AF37]/70" : "text-zinc-600"} />
                  {lead.nextFollowUp ? (
                    <>
                      <span className="text-zinc-500">Next Follow Up:</span> {formatDate(lead.nextFollowUp)}
                    </>
                  ) : (
                    <span className="text-zinc-500">No Follow Up</span>
                  )}
                </span>
              </div>

              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  prefetchLead(lead.id);
                }}
                onClick={() => onView(lead)}
                className="
                mt-3
                w-full
                rounded-xl
                border
                border-[#D4AF37]/30
                py-2.5
                text-xs
                font-medium
                text-[#D4AF37]
                transition
                hover:bg-[#D4AF37]
                hover:text-black
                "
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>

      {/* Pagination controls */}
      {total > 0 && (
        <div
          className="
          flex
          w-full
          flex-col
          items-center
          justify-between
          gap-3
          rounded-2xl
          border
          border-[#D4AF37]/20
          bg-[#161616]
          px-5
          py-4
          sm:flex-row
          "
        >
          <p className="text-xs text-zinc-400">
            Showing <span className="text-white">{startIndex}</span>-
            <span className="text-white">{endIndex}</span> of{" "}
            <span className="text-white">{total}</span> leads
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="
              flex
              h-9
              w-9
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
              <ChevronLeft size={16} />
            </button>

            <span className="min-w-[80px] text-center text-xs text-zinc-400">
              Page <span className="text-white">{currentPage}</span> of{" "}
              <span className="text-white">{totalPages}</span>
            </span>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="
              flex
              h-9
              w-9
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
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}