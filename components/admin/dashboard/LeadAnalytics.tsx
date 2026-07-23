"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  MapPin,
  Target,
  Users,
  GraduationCap,
  Clock,
  TrendingUp,
} from "lucide-react";
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

type CompletionFilter = "ALL" | "COMPLETE" | "INCOMPLETE";

type Props = {
  stats: DashboardStats;
};

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => r.json());

export default function LeadAnalytics({ stats: initialStats }: Props) {
  const [filter, setFilter] = useState<CompletionFilter>("ALL");

  const queryUrl =
    filter === "ALL"
      ? "/api/admin/dashboard/stats"
      : `/api/admin/dashboard/stats?completion=${filter}`;

  // Only re-fetches when the filter changes (initial "ALL" load reuses
  // the stats already fetched by AdminDashboard, no duplicate request).
  const { data, isLoading } = useSWR(queryUrl, fetcher, {
    revalidateOnFocus: false,
    fallbackData: filter === "ALL" ? { success: true, data: initialStats } : undefined,
  });

  const stats: DashboardStats = data?.success ? data.data : initialStats;

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

  // Keys here MUST match exactly what LeadForm.tsx saves in the
  // "bestTimeToReach" <select> options — plain hyphen "-" with
  // single spaces, and only the 5 slots that form actually offers.
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
    icon: <MapPin size={18} />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    progress: "bg-blue-500",
    data: cities,
    ranked: true,
  },
  {
    title: "Top Purposes",
    caption: "What leads are here for",
    icon: <Target size={18} />,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    progress: "bg-yellow-500",
    data: purposes,
    ranked: true,
  },
  {
    title: "Age Groups",
    caption: "Audience by generation",
    icon: <Users size={18} />,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    progress: "bg-cyan-500",
    data: ageGroupsArr.map((item) => [item.name, item.value] as const),
    ranked: false,
  },
  {
    title: "Best Time to Reach",
    caption: "When leads prefer to be contacted",
    icon: <Clock size={18} />,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    progress: "bg-purple-500",
    data: timeSlotsArr.map((item) => [item.name, item.value] as const),
    ranked: false,
  },
  {
    title: "Training Interest",
    caption: "Appetite for enrolment",
    icon: <GraduationCap size={18} />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    progress: "bg-emerald-500",
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
  rounded-3xl
  border
  border-white/10
  bg-transparent
  p-7
  sm:p-9
  `}
>
   

      <div className="relative mb-8 flex items-end justify-between gap-4">
        <div>
          

          <h2
            style={{ fontFamily: "var(--font-display)" }}
            className="
            mt-1
            text-[26px]
            font-semibold
            leading-tight
            text-[#D4AF37]
            sm:text-[28px]
            "
          >
            Lead Analytics
          </h2>

          <p className="mt-1.5 text-sm text-white/40">
            Customer insights overview
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Complete / Incomplete filter */}
          <div className="flex rounded-xl border border-white/10 bg-[#111111] p-1">
            {(
              [
                { key: "ALL", label: "All" },
                { key: "COMPLETE", label: "Complete" },
                { key: "INCOMPLETE", label: "Incomplete" },
              ] as { key: CompletionFilter; label: string }[]
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                className={`
                rounded-lg
                px-3
                py-1.5
                text-xs
                font-medium
                transition-colors
                ${
                  filter === opt.key
                    ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                    : "text-white/40 hover:text-white/70"
                }
                `}
              >
                {opt.label}
              </button>
            ))}
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
              {isLoading ? "…" : totalLeads}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-white/40">
              Total leads
            </div>
          </div>
        </div>
      </div>

      <div
        className={`
        relative
        grid
        grid-cols-1
        gap-5
        transition-opacity
        duration-200
        md:grid-cols-2
        ${isLoading ? "opacity-50" : "opacity-100"}
        `}
      >
        {sections.map((section) => (
          <div
  key={section.title}
  className={`
    group
    rounded-2xl
    border
    ${section.border}
    bg-[#111111]
    p-6
    transition-all
    duration-300
    hover:-translate-y-1
    hover:shadow-xl
    hover:shadow-black/40
    hover:${section.border.replace("border-", "border-")}
  `}
>
            <div className="flex items-center gap-3">
              <div
  className={`
    flex
    h-10
    w-10
    items-center
    justify-center
    rounded-xl
    border
    ${section.border}
    ${section.bg}
    ${section.color}
    transition-all
    duration-300
    group-hover:scale-110
  `}
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
  className={`
    h-full
    rounded-full
    ${section.progress}
    transition-[width]
    duration-700
    ease-out
  `}
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