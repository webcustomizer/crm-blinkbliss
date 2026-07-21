"use client";

import { MapPin, Target, Users, GraduationCap, Clock } from "lucide-react";
import { Playfair_Display } from "next/font/google";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

type DashboardStats = {
  totalLeads: number;
  topCities: { name: string; count: number }[];
  topPurposes: { name: string; count: number }[];
  ageGroups: Record<string, number>;
  timeSlots: Record<string, number>;
  trainingInterest: Record<string, number>;
};

type Props = {
  stats: DashboardStats;
};

export default function LeadAnalytics({ stats }: Props) {
  function getPercentage(value: number, total: number) {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }

  const totalLeads = stats.totalLeads;

  const cities = stats.topCities.map((c) => [c.name, c.count] as const);
  const purposes = stats.topPurposes.map((p) => [p.name, p.count] as const);

  const ageGroupsArr = [
    { name: "18–25", value: stats.ageGroups["18-25"] || 0 },
    { name: "26–35", value: stats.ageGroups["26-35"] || 0 },
    { name: "36+", value: stats.ageGroups["36+"] || 0 },
  ];

  const timeSlotsArr = [
    { name: "9AM – 12PM", value: stats.timeSlots["9:00 AM - 12:00 PM"] || 0 },
    { name: "12PM – 3PM", value: stats.timeSlots["12:00 PM - 3:00 PM"] || 0 },
    { name: "3PM – 6PM", value: stats.timeSlots["3:00 PM - 6:00 PM"] || 0 },
    { name: "6PM – 9PM", value: stats.timeSlots["6:00 PM - 9:00 PM"] || 0 },
    { name: "9PM – 11PM", value: stats.timeSlots["9:00 PM - 11:00 PM"] || 0 },
  ];

  const trainingArr = [
    { name: "Interested", value: stats.trainingInterest["interested"] || 0 },
    { name: "Not Interested", value: stats.trainingInterest["notInterested"] || 0 },
  ];

  const sections = [
    {
      title: "Top Cities",
      caption: "Where your leads are coming from",
      icon: <MapPin size={17} strokeWidth={1.75} />,
      data: cities,
      ranked: true,
    },
    {
      title: "Top Purposes",
      caption: "What leads are here for",
      icon: <Target size={17} strokeWidth={1.75} />,
      data: purposes,
      ranked: true,
    },
    {
      title: "Age Groups",
      caption: "Audience by generation",
      icon: <Users size={17} strokeWidth={1.75} />,
      data: ageGroupsArr.map((item) => [item.name, item.value] as const),
      ranked: false,
    },
    {
      title: "Best Time to Reach",
      caption: "When leads prefer to be contacted",
      icon: <Clock size={17} strokeWidth={1.75} />,
      data: timeSlotsArr.map((item) => [item.name, item.value] as const),
      ranked: false,
    },
    {
      title: "Training Interest",
      caption: "Appetite for enrolment",
      icon: <GraduationCap size={17} strokeWidth={1.75} />,
      data: trainingArr.map((item) => [item.name, item.value] as const),
      ranked: false,
    },
  ];

  return (
    <section
      className={`
      ${displayFont.variable}
      relative
      overflow-hidden
      rounded-[28px]
      border
      border-[#D4AF37]/20
      bg-gradient-to-b
      from-[#161616]
      to-[#0c0c0c]
      p-7
      shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]
      sm:p-9
      `}
    >
      {/* ambient gold glow, purely atmospheric */}
      <div
        aria-hidden
        className="
        pointer-events-none
        absolute
        -right-24
        -top-24
        h-72
        w-72
        rounded-full
        bg-[#D4AF37]/10
        blur-3xl
        "
      />

      <div className="relative mb-8 flex items-end justify-between gap-4">
        <div>
          <span
            className="
            text-[11px]
            font-semibold
            uppercase
            tracking-[0.2em]
            text-[#D4AF37]/70
            "
          >
            Insights
          </span>

          <h2
            style={{ fontFamily: "var(--font-display)" }}
            className="
            mt-1
            text-[26px]
            font-semibold
            leading-tight
            text-white
            sm:text-[28px]
            "
          >
            Lead Analytics
          </h2>

          <p className="mt-1.5 text-sm text-white/40">
            Customer insights overview
          </p>
        </div>

        <div
          className="
          hidden
          shrink-0
          rounded-2xl
          border
          border-[#D4AF37]/20
          bg-[#D4AF37]/[0.06]
          px-4
          py-2.5
          text-right
          sm:block
          "
        >
          <div
            style={{ fontFamily: "var(--font-display)" }}
            className="text-xl font-semibold text-[#D4AF37]"
          >
            {totalLeads}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-white/40">
            Total leads
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-5 md:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.title}
            className="
            group
            rounded-2xl
            border
            border-white/[0.08]
            bg-white/[0.02]
            p-6
            transition-colors
            duration-300
            hover:border-[#D4AF37]/25
            hover:bg-white/[0.035]
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-full
                border
                border-[#D4AF37]/25
                bg-[#D4AF37]/[0.08]
                text-[#D4AF37]
                "
              >
                {section.icon}
              </div>

              <div>
                <h3 className="text-[15px] font-semibold text-white">
                  {section.title}
                </h3>
                <p className="text-xs text-white/35">{section.caption}</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {section.data.length === 0 && (
                <p className="text-sm text-white/30">No data yet</p>
              )}

              {section.data.map(([name, value], index) => {
                const pct = getPercentage(Number(value), totalLeads);

                return (
                  <div key={String(name)}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2.5 truncate text-white/60">
                        {section.ranked && (
                          <span
                            style={{ fontFamily: "var(--font-display)" }}
                            className="
                            text-xs
                            font-semibold
                            text-[#D4AF37]/50
                            "
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        )}
                        <span className="truncate">{String(name)}</span>
                      </span>

                      <span
                        style={{ fontFamily: "var(--font-display)" }}
                        className="shrink-0 font-semibold text-white"
                      >
                        {pct}%
                      </span>
                    </div>

                    <div
                      className="
                      h-[5px]
                      overflow-hidden
                      rounded-full
                      bg-white/[0.06]
                      "
                    >
                      <div
                        className="
                        h-full
                        rounded-full
                        bg-gradient-to-r
                        from-[#8a6d1f]
                        via-[#D4AF37]
                        to-[#f1d888]
                        transition-[width]
                        duration-700
                        ease-out
                        "
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}