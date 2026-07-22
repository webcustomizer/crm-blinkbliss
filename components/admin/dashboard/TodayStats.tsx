"use client";

import { UserPlus, CheckCircle, TrendingUp } from "lucide-react";

type DashboardStats = {
  todayNewLeads: number;
  todayJoined: number;
};

type Props = {
  stats: DashboardStats;
};

export default function TodayStats({ stats }: Props) {
  const items = [
    {
      title: "New Leads",
      value: stats.todayNewLeads,
      icon: <UserPlus size={20} />,
      label: "Received today",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Joined",
      value: stats.todayJoined,
      icon: <CheckCircle size={20} />,
      label: "Converted today",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
  ];

  return (
    <section className="
      relative
      overflow-hidden
      rounded-3xl
      border
      border-[#D4AF37]/15
      
      p-6
    ">
      
      {/* Gold Glow */}
      <div
        className="
          absolute
          -right-10
          -top-10
          h-32
          w-32
          rounded-full
          bg-[#D4AF37]/5
          blur-3xl
        "
      />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#D4AF37]">
            Today's Performance
          </h2>

          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-400">
            Real-time daily activity summary
          </p>
        </div>

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
          <TrendingUp size={22} />
        </div>
      </div>


      {/* Stats */}
      <div className="relative mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.title}
            className="
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
                  ${item.border}
                  ${item.bg}
                  ${item.color}
                `}
              >
                {item.icon}
              </div>


              <h3
                className={`
                  text-4xl
                  font-bold
                  tracking-tight
                  ${item.color}
                `}
              >
                {item.value}
              </h3>

            </div>


            <div className="mt-5">
              <p className="text-sm font-semibold text-white">
                {item.title}
              </p>

              <p className="
                mt-1
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.15em]
                text-gray-400
              ">
                {item.label}
              </p>
            </div>

          </div>
        ))}
      </div>

    </section>
  );
}