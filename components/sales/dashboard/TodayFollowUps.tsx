"use client";

import { useEffect, useState } from "react";
import { Phone, Clock } from "lucide-react";

interface FollowUp {
  id: string;
  name: string | null;
  phone: string;
  status: string;
  remarks: string | null;
  nextFollowUp: string | null;
}

export default function TodayFollowUps() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFollowUps() {
      try {
        const res = await fetch("/api/salesperson/dashboard/followups", {
          cache: "no-store",
        });

        const data = await res.json();

        if (res.ok) {
          setFollowUps(data.followUps);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }

    loadFollowUps();
  }, []);

  return (
    <div
      className="
      w-full
      rounded-2xl
      border
      border-[#D4AF37]/20
      bg-[#161616]
      p-4
      "
    >
      {/* Header */}
      <div
        className="
        flex
        items-center
        justify-between
        "
      >
        <h2 className="text-base font-semibold text-white sm:text-lg">
          Today&apos;s Follow Ups
        </h2>

        <Clock size={20} className="text-[#D4AF37]" />
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-zinc-400">Loading follow ups...</p>
      ) : followUps.length === 0 ? (
        <p className="mt-5 text-sm text-zinc-400">No follow ups for today 🎉</p>
      ) : (
        <div
          className="
  mt-4
  max-h-[420px]
  space-y-3
  overflow-y-auto
  overflow-x-hidden
  "
        >
          {followUps.map((lead) => (
            <div
              key={lead.id}
              className="
              rounded-xl
              border
              border-[#D4AF37]/10
              bg-[#111111]
              p-3
              "
            >
              {/* Name + Status */}
              <div
                className="
                flex
                items-start
                justify-between
                gap-2
                "
              >
                <div className="min-w-0">
                  <p
                    className="
                    truncate
                    text-sm
                    font-semibold
                    text-white
                    "
                  >
                    {lead.name || "Unknown Lead"}
                  </p>

                  <p
                    className="
                    mt-1
                    flex
                    items-center
                    gap-2
                    text-xs
                    text-zinc-400
                    "
                  >
                    <Phone size={13} />

                    {lead.phone}
                  </p>
                </div>

                <span
                  className="
                  shrink-0
                  rounded-lg
                  bg-[#D4AF37]/10
                  px-2
                  py-1
                  text-[11px]
                  text-[#D4AF37]
                  "
                >
                  {lead.status}
                </span>
              </div>

              {/* Date */}
              <div
                className="
                mt-3
                flex
                items-center
                gap-2
                text-xs
                text-zinc-400
                "
              >
                <Clock size={13} />

                <span>
                  {lead.nextFollowUp
                    ? new Date(lead.nextFollowUp).toLocaleString()
                    : "No follow up"}
                </span>
              </div>

              {lead.remarks && (
                <p
                  className="
                  mt-2
                  line-clamp-2
                  text-xs
                  text-zinc-500
                  "
                >
                  {lead.remarks}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
