"use client";

import { UserPlus, CheckCircle, TrendingUp } from "lucide-react";

import type { LeadDetails } from "@/types/lead";

type Props = {
  leads: LeadDetails[];
};

export default function TodayStats({ leads }: Props) {
  const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

  function getPKTDayBoundary(daysOffset: number, endOfDay: boolean): Date {
    const pktNow = new Date(Date.now() + PKT_OFFSET_MS);

    const year = pktNow.getUTCFullYear();
    const month = pktNow.getUTCMonth();
    const day = pktNow.getUTCDate() + daysOffset;

    const boundaryInPKT = endOfDay
      ? new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
      : new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

    return new Date(boundaryInPKT.getTime() - PKT_OFFSET_MS);
  }

  const todayStart = getPKTDayBoundary(0, false);

  const todayEnd = getPKTDayBoundary(0, true);

  const isToday = (date?: string | null) => {
    if (!date) return false;

    const d = new Date(date);

    return d >= todayStart && d <= todayEnd;
  };

  const stats = [
    {
      title: "New Leads",

      value: leads.filter((lead) => isToday(lead.createdAt)).length,

      icon: <UserPlus size={20} />,

      label: "Received today",
    },

    {
      title: "Joined",

      value: leads.filter(
        (lead) => lead.status === "JOINED" && isToday(lead.updatedAt),
      ).length,

      icon: <CheckCircle size={20} />,

      label: "Converted today",
    },
  ];

  return (
    <section
      className="
      rounded-3xl
      border
      border-white/10
      bg-[#151515]
      p-6
      shadow-xl
      "
    >
      {/* HEADER */}

      <div
        className="
        flex
        items-center
        justify-between
        "
      >
        <div>
          <h2
            className="
  text-xl
  font-bold
  text-[#D4AF37]
  tracking-tight
  "
          >
            Today&apos;s Performance
          </h2>

          <p
            className="
            mt-1
            text-sm
            text-gray-400
            "
          >
            Real-time daily activity summary
          </p>
        </div>

        <div
          className="
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          bg-[#D4AF37]/10
          text-[#D4AF37]
          "
        >
          <TrendingUp size={20} />
        </div>
      </div>

      {/* STATS */}

      <div
        className="
        mt-6
        grid
        grid-cols-1
        divide-y
        divide-white/10
        sm:grid-cols-2
        sm:divide-x
        sm:divide-y-0
        "
      >
        {stats.map((item) => (
          <div
            key={item.title}
            className="
            flex
            items-center
            justify-between
            gap-5
            py-5
            sm:px-6
            first:sm:pl-0
            last:sm:pr-0
            "
          >
            <div
              className="
              flex
              items-center
              gap-4
              "
            >
              <div
                className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-[#D4AF37]/10
                text-[#D4AF37]
                "
              >
                {item.icon}
              </div>

              <div>
                <p
                  className="
                  text-sm
                  text-gray-400
                  "
                >
                  {item.title}
                </p>

                <p
                  className="
                  mt-1
                  text-xs
                  text-gray-500
                  "
                >
                  {item.label}
                </p>
              </div>
            </div>

            <div
              className="
              text-4xl
              font-bold
              tracking-tight
              text-white
              "
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
