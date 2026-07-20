"use client";

import { Phone, CalendarClock, MapPin } from "lucide-react";

import LeadStatusBadge from "./LeadStatusBadge";
import { formatDateTime } from "@/lib/format-date";

interface LeadCardProps {
  lead: {
    id: string;

    name: string | null;

    phone: string;

    city: string | null;

    status: string;

    nextFollowUp: string | null;

    remarks: string | null;
  };

  onView: () => void;
}

export default function LeadCard({ lead, onView }: LeadCardProps) {
  return (
    <div
      className="
      rounded-2xl
      border
      border-[#D4AF37]/20
      bg-[#161616]
      p-4
      transition
      hover:border-[#D4AF37]/50
      "
    >
      {/* Header */}

      <div
        className="
        flex
        items-start
        justify-between
        gap-3
        "
      >
        <div>
          <h3
            className="
            text-base
            font-semibold
            text-white
            "
          >
            {lead.name || "Unknown Lead"}
          </h3>

          <div
            className="
            mt-1
            flex
            items-center
            gap-1
            text-sm
            text-zinc-400
            "
          >
            <Phone size={14} />

            {lead.phone}
          </div>
        </div>

        <LeadStatusBadge status={lead.status} />
      </div>

      {/* Details */}

      <div className="mt-4 space-y-2">
        {lead.city && (
          <div
            className="
            flex
            items-center
            gap-2
            text-sm
            text-zinc-400
            "
          >
            <MapPin size={15} />

            {lead.city}
          </div>
        )}

        {lead.nextFollowUp && (
          <div
            className="
            flex
            items-center
            gap-2
            text-sm
            text-zinc-400
            "
          >
            <CalendarClock size={15} />

            {formatDateTime(lead.nextFollowUp)}
          </div>
        )}
      </div>

      {/* Remarks */}

      {lead.remarks && (
        <p
          className="
          mt-4
          rounded-xl
          bg-[#111111]
          p-3
          text-xs
          text-zinc-400
          "
        >
          {lead.remarks}
        </p>
      )}

      {/* Action */}

      <button
        onClick={onView}
        className="
        mt-4
        w-full
        rounded-xl
        border
        border-[#D4AF37]/30
        bg-[#D4AF37]/10
        py-2.5
        text-sm
        font-medium
        text-[#D4AF37]
        transition
        hover:bg-[#D4AF37]
        hover:text-black
        "
      >
        View Lead
      </button>
    </div>
  );
}
