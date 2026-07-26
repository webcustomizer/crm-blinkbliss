"use client";

import dynamic from "next/dynamic";

const TeamReports = dynamic(() => import("@/components/team-leader/reports/TeamReports"), { ssr: false });

export default function TeamReportsPage() {
  return <TeamReports />;
}
