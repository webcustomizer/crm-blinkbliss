"use client";

import { useRouter } from "next/navigation";

import {
  Users,
  UserPlus,
  PhoneCall,
  GraduationCap,
  CalendarCheck,
  CheckCircle,
  XCircle,
} from "lucide-react";

type Lead = {
  status: string;
  nextFollowUp?: string | null;
};

type Props = {
  leads: Lead[];
};

export default function FollowUpCards({ leads }: Props) {
  const router = useRouter();

  // Pakistan Standard Time UTC+5
  const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

  /**
   * Convert any date into PKT calendar date
   */
  const getPKTDateOnly = (date: string | Date) => {
    const utcDate = new Date(date);

    const pktDate = new Date(utcDate.getTime() + PKT_OFFSET_MS);

    return {
      year: pktDate.getUTCFullYear(),
      month: pktDate.getUTCMonth(),
      day: pktDate.getUTCDate(),
    };
  };

  const todayPKT = getPKTDateOnly(new Date());

  /**
   * Compare only dates, ignore time
   */
  const comparePKTDates = (
    first: ReturnType<typeof getPKTDateOnly>,
    second: ReturnType<typeof getPKTDateOnly>,
  ) => {
    const firstDate = Date.UTC(first.year, first.month, first.day);

    const secondDate = Date.UTC(second.year, second.month, second.day);

    return firstDate - secondDate;
  };

  const activeLead = (lead: Lead) => {
    return lead.status !== "JOINED" && lead.status !== "DEAD";
  };

  const todayFollowUps = leads.filter((lead) => {
    if (!lead.nextFollowUp) return false;
    if (!activeLead(lead)) return false;

    const followUpPKT = getPKTDateOnly(lead.nextFollowUp);

    return comparePKTDates(followUpPKT, todayPKT) === 0;
  });

  const overdueFollowUps = leads.filter((lead) => {
    if (!lead.nextFollowUp) return false;
    if (!activeLead(lead)) return false;

    const followUpPKT = getPKTDateOnly(lead.nextFollowUp);

    return comparePKTDates(followUpPKT, todayPKT) < 0;
  });

  const cards = [
    {
      title: "Total Leads",
      value: leads.length,
      filter: "ALL",
      icon: <Users size={22} />,
    },

    {
      title: "New Leads",
      value: leads.filter((l) => l.status === "NEW").length,
      filter: "NEW",
      icon: <UserPlus size={22} />,
    },

    {
      title: "Called",
      value: leads.filter((l) => l.status === "CALLED").length,
      filter: "CALLED",
      icon: <PhoneCall size={22} />,
    },

    {
      title: "Training",
      value: leads.filter((l) => l.status === "TRAINING_ATTENDED").length,
      filter: "TRAINING_ATTENDED",
      icon: <GraduationCap size={22} />,
    },

    {
      title: "Reserved",
      value: leads.filter((l) => l.status === "SEAT_RESERVED").length,
      filter: "SEAT_RESERVED",
      icon: <CalendarCheck size={22} />,
    },

    {
      title: "Joined",
      value: leads.filter((l) => l.status === "JOINED").length,
      filter: "JOINED",
      icon: <CheckCircle size={22} />,
    },

    {
      title: "Dead",
      value: leads.filter((l) => l.status === "DEAD").length,
      filter: "DEAD",
      icon: <XCircle size={22} />,
    },
  ];

  return (
    <div
      className="
      grid
      grid-cols-1
      gap-5
      sm:grid-cols-2
      lg:grid-cols-4
      "
    >
      {cards.map((card) => (
        <div
          key={card.title}
          onClick={() => router.push(`/admin/leads?filter=${card.filter}`)}
          className="
          group
          cursor-pointer
          rounded-2xl
          border
          border-[#D4AF37]/20
          bg-[#111111]
          p-5
          transition-all
          duration-300
          hover:-translate-y-1
          hover:border-[#D4AF37]/60
          hover:shadow-xl
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
              group-hover:bg-[#D4AF37]
              group-hover:text-black
              "
            >
              {card.icon}
            </div>

            <h2
              className="
              text-3xl
              font-bold
              text-white
              "
            >
              {card.value}
            </h2>
          </div>

          <p
            className="
            mt-5
            text-xs
            font-medium
            uppercase
            tracking-wider
            text-gray-400
            "
          >
            {card.title}
          </p>
        </div>
      ))}
    </div>
  );
}
