"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowRight, Clock, User } from "lucide-react";

interface Activity {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
  lead: {
    name: string | null;
    phone: string;
  };
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch("/api/salesperson/dashboard/activity", {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.log("Activity fetch error", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchActivities);
  }, [fetchActivities]);

  return (
    <div
      className="
      w-full
      min-w-0
      overflow-hidden
      rounded-2xl
      border
      border-[#D4AF37]/20
      bg-[#161616]
      p-3
      sm:p-5
      "
    >
      {/* Header */}
      <div
        className="
        flex
        min-w-0
        items-center
        justify-between
        gap-2
        border-b
        border-[#D4AF37]/10
        pb-3
        "
      >
        <h2
          className="
          truncate
          text-base
          font-semibold
          text-white
          sm:text-lg
          "
        >
          Recent Activity
        </h2>

        <Clock size={20} className="shrink-0 text-[#D4AF37]" />
      </div>

      {loading && (
        <p className="mt-5 text-sm text-zinc-400">Loading activity...</p>
      )}

      {!loading && activities.length === 0 && (
        <p className="mt-5 text-sm text-zinc-400">No recent activity</p>
      )}

      {!loading && activities.length > 0 && (
        <div
          className="
          mt-3
          max-h-[420px]
          space-y-3
          overflow-y-auto
          overflow-x-hidden
          "
        >
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="
              w-full
              min-w-0
              rounded-xl
              border
              border-[#D4AF37]/10
              bg-[#111111]
              p-3
              "
            >
              <div
                className="
                flex
                min-w-0
                items-start
                gap-3
                "
              >
                {/* Icon */}
                <div
                  className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-[#D4AF37]/10
                  text-[#D4AF37]
                  sm:h-9
                  sm:w-9
                  "
                >
                  <User size={16} />
                </div>

                {/* Content */}
                <div
                  className="
                  min-w-0
                  flex-1
                  "
                >
                  <p
                    className="
                    truncate
                    text-xs
                    font-semibold
                    text-white
                    sm:text-sm
                    "
                  >
                    {activity.lead.name || activity.lead.phone}
                  </p>

                  <div
                    className="
                    mt-2
                    flex
                    min-w-0
                    flex-wrap
                    items-center
                    gap-1.5
                    text-[10px]
                    text-zinc-400
                    sm:text-xs
                    "
                  >
                    <span className="max-w-full break-words">
                      {activity.oldStatus}
                    </span>

                    <ArrowRight size={12} className="shrink-0 text-[#D4AF37]" />

                    <span
                      className="
                      max-w-full
                      break-words
                      font-medium
                      text-[#D4AF37]
                      "
                    >
                      {activity.newStatus}
                    </span>
                  </div>

                  <p
                    className="
                    mt-2
                    text-[10px]
                    text-zinc-500
                    sm:text-[11px]
                    "
                  >
                    {new Date(activity.changedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
