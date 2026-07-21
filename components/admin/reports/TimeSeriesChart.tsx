"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type TimeSeriesEntry = {
  date: string;
  Leads: number;
  Joined: number;
  Dead: number;
};

type Props = { timeSeries: TimeSeriesEntry[] };

export default function TimeSeriesChart({ timeSeries }: Props) {
  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#111111] p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#D4AF37]">Lead Trends</h2>
        <p className="mt-1 text-sm text-gray-400">Daily lead volume, joins & deaths</p>
      </div>

      {timeSeries.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-gray-400">No data available</div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="green" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="red" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #D4AF37", borderRadius: 10, color: "#fff" }}
              />
              <Area type="monotone" dataKey="Leads" stroke="#D4AF37" fill="url(#gold)" strokeWidth={2} />
              <Area type="monotone" dataKey="Joined" stroke="#22c55e" fill="url(#green)" strokeWidth={2} />
              <Area type="monotone" dataKey="Dead" stroke="#ef4444" fill="url(#red)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
