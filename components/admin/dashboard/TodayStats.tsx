"use client";

import {
  UserPlus,
  CalendarClock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import type { LeadDetails } from "@/types/lead";

type Props = {
  leads: LeadDetails[];
};

export default function TodayStats({ leads }: Props) {
  // Pakistan Standard Time UTC+5
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

  const activeLead = (lead: LeadDetails) => {
    return lead.status !== "JOINED" && lead.status !== "DEAD";
  };

  const stats = [
    {
      title: "Today's Leads",
      value: leads.filter((lead) => isToday(lead.createdAt)).length,
      icon: <UserPlus size={22} />,
    },

    {
      title: "Today's Follow Ups",
      value: leads.filter(
        (lead) => activeLead(lead) && isToday(lead.nextFollowUp),
      ).length,
      icon: <CalendarClock size={22} />,
    },

    {
      title: "Overdue Follow Ups",
      value: leads.filter(
        (lead) =>
          activeLead(lead) &&
          lead.nextFollowUp &&
          new Date(lead.nextFollowUp) < todayStart,
      ).length,
      icon: <AlertCircle size={22} />,
    },

    {
      title: "Today's Joined",
      value: leads.filter(
        (lead) => lead.status === "JOINED" && isToday(lead.updatedAt),
      ).length,
      icon: <CheckCircle size={22} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2
          className="
          text-xl
          font-bold
          text-[#D4AF37]
          "
        >
          Today&apos;s Performance
        </h2>

        <p className="text-sm text-gray-400">Daily CRM activity overview</p>
      </div>

      <div
        className="
        grid
        grid-cols-1
        gap-5
        sm:grid-cols-2
        lg:grid-cols-4
        "
      >
        {stats.map((item) => (
          <div
            key={item.title}
            className="
            rounded-2xl
            border
            border-[#D4AF37]/20
            bg-[#111111]
            p-5
            transition
            hover:border-[#D4AF37]/50
            hover:shadow-lg
            hover:shadow-[#D4AF37]/10
            "
          >
            <div
              className="
              flex
              items-center
              justify-between
              "
            >
              <div
                className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-[#D4AF37]/10
                text-[#D4AF37]
                "
              >
                {item.icon}
              </div>

              <h3
                className="
                text-3xl
                font-bold
                text-white
                "
              >
                {item.value}
              </h3>
            </div>

            <p
              className="
              mt-5
              text-xs
              uppercase
              tracking-wide
              text-gray-400
              "
            >
              {item.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
