"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, AlertTriangle } from "lucide-react";

type DashboardStats = {
  todayFollowUps: number;
  overdueFollowUps: number;
};

type Props = {
  stats: DashboardStats;
};

export default function StatsCards({ stats }: Props) {
  const router = useRouter();

  const cards = [
    {
      title: "Today's Follow Ups",
      value: stats.todayFollowUps,
      filter: "TODAY_FOLLOW_UP",
      icon: <CalendarClock size={22} />,
      description: "Leads scheduled for today",
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
    },
    {
      title: "Overdue Follow Ups",
      value: stats.overdueFollowUps,
      filter: "OVERDUE_FOLLOW_UP",
      icon: <AlertTriangle size={22} />,
      description: "Pending follow-up leads",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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


            <div className="text-right">
              <h2
                className={`
                  text-4xl
                  font-bold
                  tracking-tight
                  ${card.color}
                `}
              >
                {card.value}
              </h2>

              <p
                className="
                  mt-1
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.15em]
                  text-gray-400
                "
              >
                Leads
              </p>
            </div>

          </div>


          {/* Content */}
          <div className="mt-5">

            <h3 className="text-sm font-semibold text-white">
              {card.title}
            </h3>

            <p
              className="
                mt-2
                text-xs
                font-medium
                uppercase
                tracking-wider
                text-gray-400
              "
            >
              {card.description}
            </p>

          </div>

        </div>
      ))}
    </div>
  );
}