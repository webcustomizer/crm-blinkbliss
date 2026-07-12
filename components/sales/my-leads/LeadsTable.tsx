"use client";

import { Phone, CalendarClock } from "lucide-react";

import LeadStatusBadge from "./LeadStatusBadge";

interface Lead {
  id: string;

  name: string | null;

  phone: string;

  city: string | null;

  status: string;

  nextFollowUp: string | null;

  createdAt: string;
}

interface LeadsTableProps {
  leads: Lead[];
  onView: (lead: Lead) => void;
}

export default function LeadsTable({ leads, onView }: LeadsTableProps) {
  return (
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
      <table
        className="
        w-full
        "
      >
        <thead
          className="
          border-b
          border-[#D4AF37]/20

          bg-[#111111]
          "
        >
          <tr>
            <th
              className="
              px-5
              py-4
              text-left
              text-xs
              font-medium
              text-zinc-400
              "
            >
              Lead
            </th>

            <th
              className="
              px-5
              py-4
              text-left
              text-xs
              font-medium
              text-zinc-400
              "
            >
              Phone
            </th>

            <th
              className="
              px-5
              py-4
              text-left
              text-xs
              font-medium
              text-zinc-400
              "
            >
              City
            </th>

            <th
              className="
              px-5
              py-4
              text-left
              text-xs
              font-medium
              text-zinc-400
              "
            >
              Status
            </th>

            <th
              className="
              px-5
              py-4
              text-left
              text-xs
              font-medium
              text-zinc-400
              "
            >
              Follow Up
            </th>

            <th
              className="
              px-5
              py-4
              text-right
              text-xs
              font-medium
              text-zinc-400
              "
            >
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="
                  px-5
                  py-10
                  text-center
                  text-sm
                  text-zinc-500
                  "
              >
                No leads found
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr
                key={lead.id}
                className="
                  border-b
                  border-[#D4AF37]/10

                  transition

                  hover:bg-[#D4AF37]/5
                  "
              >
                {/* Lead */}

                <td
                  className="
                    px-5
                    py-4
                    "
                >
                  <p
                    className="
                      text-sm
                      font-semibold
                      text-white
                      "
                  >
                    {lead.name || "Unknown"}
                  </p>
                </td>

                {/* Phone */}

                <td
                  className="
                    px-5
                    py-4
                    "
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-sm
                      text-zinc-300
                      "
                  >
                    <Phone size={14} />

                    {lead.phone}
                  </div>
                </td>

                {/* City */}

                <td
                  className="
                    px-5
                    py-4
                    text-sm
                    text-zinc-400
                    "
                >
                  {lead.city || "-"}
                </td>

                {/* Status */}

                <td
                  className="
                    px-5
                    py-4
                    "
                >
                  <LeadStatusBadge status={lead.status} />
                </td>

                {/* Follow Up */}

                <td
                  className="
                    px-5
                    py-4
                    "
                >
                  {lead.nextFollowUp ? (
                    <div
                      className="
                          flex
                          items-center
                          gap-2
                          text-sm
                          text-zinc-400
                          "
                    >
                      <CalendarClock size={14} />

                      {new Date(lead.nextFollowUp).toLocaleDateString()}
                    </div>
                  ) : (
                    <span
                      className="
                          text-sm
                          text-zinc-500
                          "
                    >
                      -
                    </span>
                  )}
                </td>

                {/* Action */}

                <td
                  className="
                    px-5
                    py-4
                    text-right
                    "
                >
                  <button
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
  );
}
