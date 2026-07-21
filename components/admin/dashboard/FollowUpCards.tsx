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

type DashboardStats = {
  totalLeads: number;
  statusCounts: Record<string, number>;
};

type Props = {
  stats: DashboardStats;
};

export default function FollowUpCards({ stats }: Props) {
  const router = useRouter();

  const sc = stats.statusCounts;

  const cards = [
    {
      title: "Total Leads",
      value: stats.totalLeads,
      filter: "ALL",
      icon: <Users size={22} />,
    },

    {
      title: "New Leads",
      value: sc["NEW"] || 0,
      filter: "NEW",
      icon: <UserPlus size={22} />,
    },

    {
      title: "Called",
      value: sc["CALLED"] || 0,
      filter: "CALLED",
      icon: <PhoneCall size={22} />,
    },

    {
      title: "Training",
      value: sc["TRAINING_ATTENDED"] || 0,
      filter: "TRAINING_ATTENDED",
      icon: <GraduationCap size={22} />,
    },

    {
      title: "Reserved",
      value: sc["SEAT_RESERVED"] || 0,
      filter: "SEAT_RESERVED",
      icon: <CalendarCheck size={22} />,
    },

    {
      title: "Joined",
      value: sc["JOINED"] || 0,
      filter: "JOINED",
      icon: <CheckCircle size={22} />,
    },

    {
      title: "Dead",
      value: sc["DEAD"] || 0,
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
