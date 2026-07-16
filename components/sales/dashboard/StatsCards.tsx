import {
  Users,
  UserPlus,
  PhoneCall,
  GraduationCap,
  Armchair,
  CheckCircle,
  XCircle,
  CalendarClock,
  AlertCircle,
  Clock3,
} from "lucide-react";

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  calledLeads: number;
  trainingLeads: number;
  reservedLeads: number;
  joinedLeads: number;
  deadLeads: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  upcomingFollowUps: number;
  conversionRate: number;
}

interface StatsCardsProps {
  stats: DashboardStats;
}

const cards = [
  {
    title: "Total Leads",
    key: "totalLeads",
    icon: Users,
  },
  {
    title: "New Leads",
    key: "newLeads",
    icon: UserPlus,
  },
  {
    title: "Called",
    key: "calledLeads",
    icon: PhoneCall,
  },
  {
    title: "Training",
    key: "trainingLeads",
    icon: GraduationCap,
  },
  {
    title: "Reserved",
    key: "reservedLeads",
    icon: Armchair,
  },
  {
    title: "Joined",
    key: "joinedLeads",
    icon: CheckCircle,
  },
  {
    title: "Dead",
    key: "deadLeads",
    icon: XCircle,
  },
  {
    title: "Today's Follow Ups",
    key: "todayFollowUps",
    icon: CalendarClock,
  },
  {
    title: "Upcoming (2 Days)",
    key: "upcomingFollowUps",
    icon: Clock3,
  },
  {
    title: "Overdue",
    key: "overdueFollowUps",
    icon: AlertCircle,
  },
];

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        const value = stats[card.key as keyof DashboardStats];

        return (
          <div
            key={card.key}
            className="
              rounded-2xl
              border
              border-[#D4AF37]/20
              bg-[#161616]
              p-4
              transition
              hover:border-[#D4AF37]/60
            "
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                <Icon size={20} />
              </div>
            </div>

            <p className="mt-4 text-2xl font-bold text-white">{value ?? 0}</p>

            <p className="mt-1 text-xs text-zinc-400">{card.title}</p>
          </div>
        );
      })}
    </div>
  );
}
