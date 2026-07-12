"use client";

import {
  Trophy,
  Phone,
  CalendarClock,
  GraduationCap,
  CalendarCheck,
  CheckCircle,
  XCircle,
  TrendingUp,
} from "lucide-react";

type Lead = {
  id: string;
  status: string;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
};

interface Props {
  leads: Lead[];
}

export default function SalesReportTable({ leads }: Props) {
  const report = Object.values(
    leads.reduce(
      (acc, lead) => {
        if (!lead.assignedTo) return acc;

        const id = lead.assignedTo.id;

        if (!acc[id]) {
          acc[id] = {
            id,
            name: lead.assignedTo.name,
            total: 0,
            called: 0,
            followups: 0,
            training: 0,
            reserved: 0,
            joined: 0,
            dead: 0,
          };
        }

        acc[id].total++;

        switch (lead.status) {
          case "CALLED":
            acc[id].called++;
            break;

          case "NEED_MORE_FOLLOW_UP":
            acc[id].followups++;
            break;

          case "TRAINING_ATTENDED":
            acc[id].training++;
            break;

          case "SEAT_RESERVED":
            acc[id].reserved++;
            break;

          case "JOINED":
            acc[id].joined++;
            break;

          case "DEAD":
            acc[id].dead++;
            break;
        }

        return acc;
      },
      {} as Record<
        string,
        {
          id: string;
          name: string;
          total: number;
          called: number;
          followups: number;
          training: number;
          reserved: number;
          joined: number;
          dead: number;
        }
      >,
    ),
  );

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
      <div
        className="
        flex
        items-center
        justify-between
        border-b
        border-[#D4AF37]/20
        px-6
        py-5
        "
      >
        <div>
          <h2 className="text-xl font-bold text-[#D4AF37]">
            Salesperson Performance
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Individual conversion & productivity report
          </p>
        </div>

        <div
          className="
          rounded-xl
          border
          border-[#D4AF37]/20
          bg-[#D4AF37]/10
          px-4
          py-2
          text-right
          "
        >
          <p className="text-xs text-gray-400">Salespersons</p>

          <p className="text-xl text-center font-bold text-[#D4AF37]">
            {report.length}
          </p>
        </div>
      </div>

      {report.length === 0 ? (
        <div className="p-10 text-center text-gray-400">
          No salesperson has been assigned any lead yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[#D4AF37]">
                <th className="px-5 py-4 text-left">Salesperson</th>

                <th className="px-4 py-4 text-center">Total</th>

                <th className="px-4 py-4 text-center">
                  <Phone className="mx-auto mb-1 h-4 w-4" />
                  Called
                </th>

                <th className="px-4 py-4 text-center">
                  <CalendarClock className="mx-auto mb-1 h-4 w-4" />
                  Follow Up
                </th>

                <th className="px-4 py-4 text-center">
                  <GraduationCap className="mx-auto mb-1 h-4 w-4" />
                  Training
                </th>

                <th className="px-4 py-4 text-center">
                  <CalendarCheck className="mx-auto mb-1 h-4 w-4" />
                  Reserved
                </th>

                <th className="px-4 py-4 text-center">
                  <CheckCircle className="mx-auto mb-1 h-4 w-4" />
                  Joined
                </th>

                <th className="px-4 py-4 text-center">
                  <XCircle className="mx-auto mb-1 h-4 w-4" />
                  Dead
                </th>

                <th className="px-4 py-4 text-center">
                  <TrendingUp className="mx-auto mb-1 h-4 w-4" />
                  Conversion
                </th>
              </tr>
            </thead>

            <tbody>
              {report.map((person) => {
                const conversion =
                  person.total > 0
                    ? ((person.joined / person.total) * 100).toFixed(0)
                    : "0";

                return (
                  <tr
                    key={person.id}
                    className="
                    border-b
                    border-white/5
                    text-gray-200
                    transition-all
                    hover:bg-[#D4AF37]/5
                    "
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-full
                          bg-[#D4AF37]/10
                          font-bold
                          text-[#D4AF37]
                          "
                        >
                          {person.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className="font-semibold text-white">
                            {person.name}
                          </p>

                          <p className="text-xs text-gray-500">
                            Sales Executive
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="font-bold text-white">
                        {person.total}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                        {person.called}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
                        {person.followups}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
                        {person.training}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
                        {person.reserved}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                        {person.joined}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                        {person.dead}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <div className="mx-auto w-24">
                        <div className="mb-1 flex justify-between text-xs">
                          <span>{conversion}%</span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[#D4AF37]"
                            style={{
                              width: `${conversion}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
