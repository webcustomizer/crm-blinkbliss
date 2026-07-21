"use client";

import { useEffect, useState } from "react";
import type { FunnelStage } from "@/types/lead";
import { handleAPIError } from "@/lib/client-error";

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-blue-500",
  CALLED: "bg-yellow-500",
  NEED_MORE_FOLLOW_UP: "bg-orange-500",
  TRAINING_ATTENDED: "bg-indigo-500",
  SEAT_RESERVED: "bg-purple-500",
  JOINED: "bg-emerald-500",
};

export default function FunnelChart() {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [deadCount, setDeadCount] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/analytics/funnel");
        const json = await res.json();
        if (json.success) {
          setStages(json.data.stages);
          setDeadCount(json.data.deadCount);
          setTotalLeads(json.data.totalLeads);
        }
      } catch (e) { handleAPIError(e, "Failed to load funnel data"); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="h-48 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" /></div>;
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
      <h3 className="text-sm font-semibold text-[#D4AF37] mb-4">Lead Conversion Funnel</h3>
      <div className="space-y-3">
        {stages.map((stage) => {
          const widthPct = (stage.count / maxCount) * 100;
          return (
            <div key={stage.stage} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-32 truncate text-right shrink-0">
                {stage.stage.replace(/_/g, " ")}
              </span>
              <div className="flex-1 h-7 bg-white/5 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full rounded-lg transition-all duration-700 ${STAGE_COLORS[stage.stage] || "bg-gray-500"}`}
                  style={{ width: `${widthPct}%` }}
                />
                <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-white">
                  {stage.count}
                </span>
              </div>
              <span className="text-xs text-gray-500 w-10 text-left shrink-0">{stage.percentage}%</span>
            </div>
          );
        })}
      </div>
      {deadCount > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm">
          <span className="text-red-400">Dead</span>
          <span className="text-red-400 font-medium">{deadCount}</span>
          <span className="text-gray-500">{totalLeads > 0 ? Math.round((deadCount / totalLeads) * 100) : 0}%</span>
        </div>
      )}
    </div>
  );
}
