import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

import ProfileHeader from "@/components/team-leader/profile/ProfileHeader";
import PersonalInformationCard from "@/components/team-leader/profile/PersonalInformationCard";
import ChangePasswordCard from "@/components/team-leader/profile/ChangePasswordCard";

export default async function TeamLeaderProfilePage(props: { searchParams: Promise<{ forceChange?: string }> }) {
  const { forceChange } = await props.searchParams;
  const cookieStore = await cookies();

  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  const user = await verifyToken(token);

  const profile = await prisma.user.findUnique({
    where: {
      id: user.id,
    },

    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!profile) {
    redirect("/login");
  }

  const formattedProfile = {
    ...profile,
    createdAt: profile.createdAt.toLocaleDateString("en-US", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* PROFILE HEADER */}
      <ProfileHeader profile={formattedProfile} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PERSONAL INFORMATION */}
        <PersonalInformationCard profile={formattedProfile} />

        {/* CHANGE PASSWORD */}
        <ChangePasswordCard forceChange={forceChange === "true"} />
      </div>
    </div>
  );
}
