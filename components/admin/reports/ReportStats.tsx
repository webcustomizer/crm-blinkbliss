"use client";

import { Users, UserCheck, UserX, CalendarCheck, Activity, TrendingUp, Phone, GraduationCap } from "lucide-react";

type Lead = { status: string };
type Props = { leads: Lead[] };

export default function ReportStats({ leads }: Props) {
  const total = leads.length;
  const joined = leads.filter((l) => l.status === "JOINED").length;
  const dead = leads.filter((l) => l.status === "DEAD").length;
  const reserved = leads.filter((l) => l.status === "SEAT_RESERVED").length;
  const active = leads.filter((l) => l.status !== "JOINED" && l.status !== "DEAD").length;
  const called = leads.filter((l) => l.status === "CALLED").length;
  const training = leads.filter((l) => l.status === "TRAINING_ATTENDED").length;
  const conversion = total > 0 ? ((joined / total) * 100).toFixed(1) : "0";

  const cards = [
    { title: "Total Leads", value: total, icon: <Users size={20} />, color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/10" },
    { title: "Active Pipeline", value: active, icon: <Activity size={20} />, color: "text-blue-400", bg: "bg-blue-500/10" },
    { title: "Called", value: called, icon: <Phone size={20} />, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { title: "Training", value: training, icon: <GraduationCap size={20} />, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { title: "Reserved", value: reserved, icon: <CalendarCheck size={20} />, color: "text-purple-400", bg: "bg-purple-500/10" },
    { title: "Joined", value: joined, icon: <UserCheck size={20} />, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { title: "Dead", value: dead, icon: <UserX size={20} />, color: "text-red-400", bg: "bg-red-500/10" },
    { title: "Conversion", value: `${conversion}%`, icon: <TrendingUp size={20} />, color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/10" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className="rounded-2xl border border-[#D4AF37]/15 bg-[#111111] p-4 transition-all hover:border-[#D4AF37]/40 hover:shadow-lg hover:shadow-[#D4AF37]/5">
          <div className="flex items-center justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
              {card.icon}
            </div>
            <h3 className={`text-2xl font-bold ${card.color}`}>{card.value}</h3>
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-gray-400">{card.title}</p>
        </div>
      ))}
    </div>
  );
}
