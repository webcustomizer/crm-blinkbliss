"use client";

import {
  Users,
  UserCheck,
  UserX,
  CalendarCheck,
  Activity,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

type Props = {
  leads: any[];
};

export default function ReportStats({ leads }: Props) {
  const total = leads.length;

  const joined = leads.filter((lead) => lead.status === "JOINED").length;

  const dead = leads.filter((lead) => lead.status === "DEAD").length;

  const reserved = leads.filter(
    (lead) => lead.status === "SEAT_RESERVED",
  ).length;

  const active = leads.filter(
    (lead) => lead.status !== "JOINED" && lead.status !== "DEAD",
  ).length;

  const conversion = total > 0 ? ((joined / total) * 100).toFixed(1) : "0";

  const cards = [
    {
      title: "Total Leads",
      value: total,
      icon: <Users size={22} />,
    },

    {
      title: "Active Leads",
      value: active,
      icon: <Activity size={22} />,
    },

    {
      title: "Reserved",
      value: reserved,
      icon: <CalendarCheck size={22} />,
    },

    {
      title: "Joined",
      value: joined,
      icon: <UserCheck size={22} />,
    },

    {
      title: "Dead",
      value: dead,
      icon: <UserX size={22} />,
    },

    {
      title: "Conversion Rate",
      value: `${conversion}%`,
      icon: <TrendingUp size={22} />,
    },
  ];

  return (
    <div
      className="
    grid
    grid-cols-1
    sm:grid-cols-2
    lg:grid-cols-3
    gap-5
    "
    >
      {cards.map((card) => (
        <div
          key={card.title}
          className="
          rounded-2xl
          border
          border-[#D4AF37]/20
          bg-[#111111]
          p-5
          transition-all
          hover:border-[#D4AF37]/50
          hover:shadow-lg
          hover:shadow-[#D4AF37]/10
          "
        >
          <div
            className="
            flex
            items-center
            justify-between
            "
          >
            <div
              className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              bg-[#D4AF37]/10
              text-[#D4AF37]
              "
            >
              {card.icon}
            </div>

            <h2
              className="
              text-3xl
              font-bold
              text-white
              "
            >
              {card.value}
            </h2>
          </div>

          <p
            className="
            mt-4
            text-sm
            uppercase
            text-gray-400
            "
          >
            {card.title}
          </p>
        </div>
      ))}
    </div>
  );
}
