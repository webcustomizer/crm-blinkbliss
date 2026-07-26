"use client";

import dynamic from "next/dynamic";

const TeamOverview = dynamic(() => import("@/components/team-leader/team/TeamOverview"), { ssr: false });

export default function MyTeamPage() {
  return <TeamOverview />;
}