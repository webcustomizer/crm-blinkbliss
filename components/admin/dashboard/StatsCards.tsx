"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, AlertTriangle } from "lucide-react";

type Lead = {
  nextFollowUp?: string | Date | null;
  status?: string;
};

type Props = {
  leads: Lead[];
};

export default function FollowUpCards({ leads }: Props) {
  const router = useRouter();

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

  const activeLead = (lead: Lead) => {
    return lead.status !== "JOINED" && lead.status !== "DEAD";
  };

  const todayFollowUps = leads.filter((lead) => {
    if (!lead.nextFollowUp) return false;

    if (!activeLead(lead)) return false;

    const followUpDate = new Date(lead.nextFollowUp);

    return followUpDate >= todayStart && followUpDate <= todayEnd;
  });

  const overdueFollowUps = leads.filter((lead) => {
    if (!lead.nextFollowUp) return false;

    if (!activeLead(lead)) return false;

    const followUpDate = new Date(lead.nextFollowUp);

    return followUpDate < todayStart;
  });

  const cards = [
    {
      title: "Today's Follow Ups",
      value: todayFollowUps.length,
      filter: "TODAY_FOLLOW_UP",
      icon: <CalendarClock size={24} />,
      description: "Leads scheduled for today",
    },

    {
      title: "Overdue Follow Ups",
      value: overdueFollowUps.length,
      filter: "OVERDUE_FOLLOW_UP",
      icon: <AlertTriangle size={24} />,
      description: "Pending follow up leads",
    },
  ];

  return (
    <div
      className="
      grid
      grid-cols-1
      md:grid-cols-2
      gap-5
      "
    >
      {cards.map((card) => (
        <div
          key={card.title}
          onClick={() => router.push(`/admin/leads?filter=${card.filter}`)}
          className="
          cursor-pointer
          rounded-2xl
          border
          border-[#D4AF37]/20
          bg-[#111111]
          p-6
          transition-all
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
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              bg-[#D4AF37]/10
              text-[#D4AF37]
              "
            >
              {card.icon}
            </div>

            <h2
              className="
              text-4xl
              font-bold
              text-white
              "
            >
              {card.value}
            </h2>
          </div>

          <h3
            className="
            mt-5
            text-lg
            font-semibold
            text-[#D4AF37]
            "
          >
            {card.title}
          </h3>

          <p
            className="
            mt-2
            text-sm
            text-gray-400
            "
          >
            {card.description}
          </p>
        </div>
      ))}
    </div>
  );
}
