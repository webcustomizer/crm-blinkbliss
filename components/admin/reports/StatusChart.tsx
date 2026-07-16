"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Lead = {
  status: string;
};

type Props = {
  leads: Lead[];
};

export default function StatusChart({ leads }: Props) {
  const statuses = [
    {
      name: "New",
      key: "NEW",
    },

    {
      name: "Called",
      key: "CALLED",
    },

    {
      name: "Follow Up",
      key: "NEED_MORE_FOLLOW_UP",
    },

    {
      name: "Training",
      key: "TRAINING_ATTENDED",
    },

    {
      name: "Reserved",
      key: "SEAT_RESERVED",
    },

    {
      name: "Joined",
      key: "JOINED",
    },

    {
      name: "Dead",
      key: "DEAD",
    },
  ];

  const data = statuses
    .map((item) => ({
      name: item.name,

      value: leads.filter((lead) => lead.status === item.key).length,
    }))
    .filter((item) => item.value > 0);

  return (
    <div
      className="
    rounded-2xl
    border
    border-[#D4AF37]/20
    bg-[#111111]
    p-6
    "
    >
      <div className="mb-5">
        <h2
          className="
        text-xl
        font-bold
        text-[#D4AF37]
        "
        >
          Lead Status Distribution
        </h2>

        <p
          className="
        mt-1
        text-sm
        text-gray-400
        "
        >
          Current lead status overview
        </p>
      </div>

      {data.length === 0 ? (
        <div
          className="
          flex
          h-[300px]
          items-center
          justify-center
          text-gray-400
          "
        >
          No data available
        </div>
      ) : (
        <div
          className="
          h-[320px]
          "
        >
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
