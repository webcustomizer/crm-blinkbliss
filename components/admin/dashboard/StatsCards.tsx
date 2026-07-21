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
      icon: <CalendarClock size={24} />,
      description: "Leads scheduled for today",
    },

    {
      title: "Overdue Follow Ups",
      value: stats.overdueFollowUps,
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
    gap-5
    sm:grid-cols-2
    "
    >
      {cards.map((card) => (
        <div
          key={card.title}
          onClick={() => router.push(`/admin/leads?filter=${card.filter}`)}
          className="
        group
        cursor-pointer
        relative
        overflow-hidden
        rounded-3xl
        border
        border-white/10
        bg-gradient-to-br
        from-[#181818]
        to-[#0c0c0c]
        p-6
        shadow-xl
        "
        >
          {/* Gold Glow */}
          <div
            className="
          absolute
          -right-12
          -top-12
          h-32
          w-32
          rounded-full
          bg-[#D4AF37]/10
          blur-3xl
          "
          />

          <div
            className="
          relative
          flex
          items-start
          justify-between
          "
          >
            <div
              className="
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            border
            border-[#D4AF37]/20
            bg-[#D4AF37]/10
            text-[#D4AF37]
            "
            >
              {card.icon}
            </div>

            <div
              className="
            text-right
            "
            >
              <p
                className="
              text-4xl
              font-bold
              tracking-tight
              text-white
              "
              >
                {card.value}
              </p>

              <p
                className="
              mt-1
              text-xs
              uppercase
              tracking-widest
              text-gray-500
              "
              >
                Leads
              </p>
            </div>
          </div>

          <div
            className="
          relative
          mt-7
          "
          >
            <h3
              className="
            text-xl
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
            leading-relaxed
            text-gray-400
            "
            >
              {card.description}
            </p>
          </div>

          <div
            className="
          relative
          mt-6
          h-px
          w-full
          bg-white/10
          "
          />

          <div
            className="
          relative
          mt-4
          flex
          items-center
          justify-between
          text-xs
          text-gray-500
          "
          >
            <span>Click to view leads</span>

            <span
              className="
            text-[#D4AF37]
            "
            >
              →
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
