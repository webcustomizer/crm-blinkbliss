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
      color: "text-[#D4AF37]",
      bg: "bg-[#D4AF37]/10",
      border: "border-[#D4AF37]/20",
    },
    {
      title: "New Leads",
      value: sc["NEW"] || 0,
      filter: "NEW",
      icon: <UserPlus size={22} />,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Called",
      value: sc["CALLED"] || 0,
      filter: "CALLED",
      icon: <PhoneCall size={22} />,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
    },
    {
      title: "Training",
      value: sc["TRAINING_ATTENDED"] || 0,
      filter: "TRAINING_ATTENDED",
      icon: <GraduationCap size={22} />,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
    },
    {
      title: "Reserved",
      value: sc["SEAT_RESERVED"] || 0,
      filter: "SEAT_RESERVED",
      icon: <CalendarCheck size={22} />,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      title: "Joined",
      value: sc["JOINED"] || 0,
      filter: "JOINED",
      icon: <CheckCircle size={22} />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Dead",
      value: sc["DEAD"] || 0,
      filter: "DEAD",
      icon: <XCircle size={22} />,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          onClick={() =>
            router.push(`/admin/leads?filter=${card.filter}`)
          }
          className="
            cursor-pointer
            rounded-2xl
            border
            border-[#D4AF37]/15
            bg-[#111111]
            p-5
            transition-all
            duration-300
            hover:-translate-y-1
            hover:border-[#D4AF37]/40
            hover:bg-[#161616]
            hover:shadow-lg
            hover:shadow-[#D4AF37]/5
          "
        >

          {/* Header */}
          <div className="flex items-center justify-between">

            <div
              className={`
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                border
                ${card.border}
                ${card.bg}
                ${card.color}
              `}
            >
              {card.icon}
            </div>


            <h2
              className={`
                text-3xl
                font-bold
                tracking-tight
                ${card.color}
              `}
            >
              {card.value}
            </h2>

          </div>


          {/* Content */}
          <div className="mt-5">

            <h3
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.15em]
                text-gray-400
              "
            >
              {card.title}
            </h3>

          </div>

        </div>
      ))}
    </div>
  );
}