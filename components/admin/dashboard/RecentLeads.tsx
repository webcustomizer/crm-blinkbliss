"use client";

import { useRouter } from "next/navigation";
import LeadDetailsDialog from "../leads/LeadDetailsDialog";

type Props = {
  leads: any[];
};

export default function RecentLeads({ leads }: Props) {
  const router = useRouter();

  const recentLeads = [...leads]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10);

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
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";

      case "NEED_MORE_FOLLOW_UP":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  }

  return (
    <div
      className="
      overflow-hidden
      rounded-2xl
      border
      border-[#D4AF37]/20
      bg-[#111111]
      "
    >
      <div
        className="
        flex
        items-center
        justify-between
        border-b
        border-[#D4AF37]/20
        p-5
        "
      >
        <div>
          <h2
            className="
            text-xl
            font-bold
            text-[#D4AF37]
            "
          >
            Recent Leads
          </h2>

          <p className="mt-1 text-sm text-gray-400">Latest created leads</p>
        </div>

        <button
          onClick={() => router.push("/admin/leads")}
          className="
          rounded-lg
          border
          border-[#D4AF37]/30
          px-4
          py-2
          text-sm
          text-[#D4AF37]
          hover:bg-[#D4AF37]/10
          "
        >
          View All
        </button>
      </div>

      {recentLeads.length === 0 ? (
        <div className="p-10 text-center text-gray-400">
          No leads available.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="
                border-b
                border-white/10
                bg-black/40
                text-[#D4AF37]
                "
              >
                <th className="p-4 text-left">Name</th>

                <th className="p-4 text-left">Salesperson</th>

                <th className="p-4 text-left">Status</th>

                <th className="p-4 text-left">Follow Up</th>

                <th className="p-4 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {recentLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="
                  border-b
                  border-white/5
                  text-gray-200
                  hover:bg-[#D4AF37]/5
                  "
                >
                  <td className="p-4 text-white">
                    <div className="font-medium">{lead.name || "-"}</div>

                    <div className="text-xs text-gray-400">{lead.phone}</div>
                  </td>

                  <td className="p-4">
                    {lead.assignedTo?.name || "Unassigned"}
                  </td>

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
                      {lead.status ? lead.status.replaceAll("_", " ") : "-"}
                    </span>
                  </td>

                  <td className="p-4 text-gray-300">
                    {lead.nextFollowUp
                      ? new Date(lead.nextFollowUp).toLocaleString()
                      : "-"}
                  </td>

                  <td className="p-4">
                    <LeadDetailsDialog
                      leadId={lead.id}
                      onUpdate={() => router.refresh()}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
