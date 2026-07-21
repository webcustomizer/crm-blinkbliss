"use client";

import { useEffect, useState } from "react";
import LiveActivityFeed from "@/components/admin/activity/LiveActivityFeed";
import { Activity, Users, PhoneCall, RefreshCcw, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ActivityLog {
  id: string;

  action: string;

  description: string;

  createdAt: string;

  user: {
    name: string;
    role: string;
  };

  lead?: {
    name: string | null;
    phone: string;
  } | null;

  metadata?: any;
}

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const [loading, setLoading] = useState(true);

  async function getActivities() {
    try {
      const res = await fetch("/api/admin/activity", {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        setActivities(data.activities || []);
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getActivities();

    const channel = supabase
      .channel("admin-activity-stream")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ActivityLog",
        },

        () => {
          getActivities();
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = {
    total: activities.length,
    note: "Showing last 100 entries",

    login: activities.filter((a) => a.action === "LOGIN").length,

    updates: activities.filter((a) => a.action === "LEAD_UPDATED").length,

    followups: activities.filter((a) => a.action === "FOLLOWUP_COMPLETED")
      .length,
  };

  return (
    <div
      className="
space-y-6
"
    >
      {/* Header */}

      <div
        className="
rounded-2xl
border
border-[#D4AF37]/20
bg-[#111111]
p-6
"
      >
        <div
          className="
flex
items-center
justify-between
"
        >
          <div>
            <h1
              className="
text-2xl
font-bold
text-white
"
            >
              Activity Center
            </h1>

            <p
              className="
mt-1
text-sm
text-zinc-400
"
            >
              Monitor every salesperson action live — {stats.note}
            </p>
          </div>

          <div
            className="
flex
items-center
gap-2
text-green-400
text-sm
"
          >
            <span
              className="
h-2
w-2
rounded-full
bg-green-400
animate-pulse
"
            />
            Live Monitoring
          </div>
        </div>
      </div>

      {/* Stats */}

      <div
        className="
grid
grid-cols-2
gap-4
md:grid-cols-4
"
      >
        <StatCard
          title="Total Activity"
          value={stats.total}
          icon={<Activity size={20} />}
        />

        <StatCard
          title="Logins"
          value={stats.login}
          icon={<LogIn size={20} />}
        />

        <StatCard
          title="Lead Updates"
          value={stats.updates}
          icon={<RefreshCcw size={20} />}
        />

        <StatCard
          title="Follow Ups"
          value={stats.followups}
          icon={<PhoneCall size={20} />}
        />
      </div>

      {/* Feed */}

      {loading ? (
        <div
          className="
rounded-2xl
bg-[#111111]
p-6
text-zinc-400
"
        >
          Loading activity...
        </div>
      ) : (
        <LiveActivityFeed activities={activities} />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
rounded-2xl
border
border-[#D4AF37]/20
bg-[#161616]
p-5
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
h-10
w-10
items-center
justify-center
rounded-xl
bg-[#D4AF37]/10
text-[#D4AF37]
"
        >
          {icon}
        </div>
      </div>

      <p
        className="
mt-4
text-2xl
font-bold
text-white
"
      >
        {value}
      </p>

      <p
        className="
text-xs
text-zinc-400
"
      >
        {title}
      </p>
    </div>
  );
}
