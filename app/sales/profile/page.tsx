import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

import ProfileHeader from "@/components/sales/profile/ProfileHeader";
import PersonalInformationCard from "@/components/sales/profile/PersonalInformationCard";
import ChangePasswordCard from "@/components/sales/profile/ChangePasswordCard";

export default async function SalespersonProfilePage() {
  const cookieStore = await cookies();

  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
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
    return null;
  }

  const formattedProfile = {
    ...profile,

    createdAt: profile.createdAt.toISOString(),
  };

  return (
    <main
      className="
      min-h-screen
      rounded-3xl
      bg-black
      p-4
      sm:p-6
      lg:p-8
      "
    >
      <div
        className="
        mx-auto
        max-w-5xl
        space-y-6
        "
      >
        {/* PROFILE HEADER */}

        <ProfileHeader profile={formattedProfile} />

        <div
          className="
          grid
          grid-cols-1
          gap-6
          lg:grid-cols-2
          "
        >
          {/* PERSONAL INFORMATION */}

          <PersonalInformationCard profile={formattedProfile} />

          {/* CHANGE PASSWORD */}

          <ChangePasswordCard />
        </div>
      </div>
    </main>
  );
}
