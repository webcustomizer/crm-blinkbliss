"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type Stage = { stage: string; count: number; percentage: number };
type Props = { stages: Stage[]; totalLeads: number; deadCount: number };

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  CALLED: "Called",
  NEED_MORE_FOLLOW_UP: "Follow Up",
  TRAINING_ATTENDED: "Training",
  SEAT_RESERVED: "Reserved",
  JOINED: "Joined",
};

const STAGE_COLORS: Record<string, string> = {
  NEW: "#3b82f6",
  CALLED: "#eab308",
  NEED_MORE_FOLLOW_UP: "#a855f7",
  TRAINING_ATTENDED: "#06b6d4",
  SEAT_RESERVED: "#8b5cf6",
  JOINED: "#22c55e",
};

export default function FunnelChart({ stages, totalLeads, deadCount }: Props) {
  const data = stages.map((s) => ({
    name: STAGE_LABELS[s.stage] || s.stage,
    count: s.count,
    pct: s.percentage,
    stage: s.stage,
  }));

  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#111111] p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#D4AF37]">Conversion Funnel</h2>
        <p className="mt-1 text-sm text-gray-400">Lead pipeline stage breakdown</p>
      </div>

      {totalLeads === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-gray-400">No data available</div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#d4d4d8", fontSize: 12 }} width={80} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #D4AF37", borderRadius: 10, color: "#fff" }}
                formatter={(value, _name, props) => [`${value} (${props?.payload?.pct}%)`, "Leads"]}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={28}>
                {data.map((entry) => (
                  <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-5 py-3">
        <div className="text-sm text-gray-400">
          Total: <span className="font-bold text-white">{totalLeads}</span> leads
        </div>
        <div className="text-sm text-gray-400">
          Dead: <span className="font-bold text-red-400">{deadCount}</span>
        </div>
        <div className="text-sm text-gray-400">
          Overall conversion:{" "}
          <span className="font-bold text-[#D4AF37]">
            {totalLeads > 0 ? ((stages.find((s) => s.stage === "JOINED")?.count || 0) / totalLeads * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>
    </div>
  );
}
