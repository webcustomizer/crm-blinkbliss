"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Lead = { createdAt: string; status: string };
type Props = { leads: Lead[] };

function groupByDate(leads: Lead[]) {
  const map = new Map<string, { total: number; joined: number; dead: number }>();
  for (const l of leads) {
    const d = new Date(l.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, { total: 0, joined: 0, dead: 0 });
    const entry = map.get(key)!;
    entry.total++;
    if (l.status === "JOINED") entry.joined++;
    if (l.status === "DEAD") entry.dead++;
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
      Leads: v.total,
      Joined: v.joined,
      Dead: v.dead,
    }));
}

export default function TimeSeriesChart({ leads }: Props) {
  const data = groupByDate(leads);

  return (
    <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#111111] p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#D4AF37]">Lead Trends</h2>
        <p className="mt-1 text-sm text-gray-400">Daily lead volume, joins & deaths</p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-gray-400">No data available</div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
