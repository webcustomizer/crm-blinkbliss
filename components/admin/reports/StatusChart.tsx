"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Props = {
  statusCounts: Record<string, number>;
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CALLED: "Called",
  NEED_MORE_FOLLOW_UP: "Follow Up",
  TRAINING_ATTENDED: "Training",
  SEAT_RESERVED: "Reserved",
  JOINED: "Joined",
  DEAD: "Dead",
};

export default function StatusChart({ statusCounts }: Props) {
  const data = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key] || key,
      value,
    }));

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#D4AF37]">Status Distribution</h2>
        <p className="mt-1 text-sm text-gray-400">Lead status overview</p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-gray-400">
          No data available
        </div>
      ) : (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={60}
                dataKey="value"
                label
              >
                {data.map((item, index) => (
                  <Cell
                    key={index}
                    fill={
                      [
                        "#3b82f6",
                        "#eab308",
                        "#a855f7",
                        "#06b6d4",
                        "#8b5cf6",
                        "#22c55e",
                        "#ef4444",
                      ][index]
                    }
                  />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  background: "#111111",
                  border: "1px solid #D4AF37",
                  borderRadius: "10px",
                  color: "#fff",
                }}
              />

              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
