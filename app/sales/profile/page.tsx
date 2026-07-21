import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

import ProfileHeader from "@/components/sales/profile/ProfileHeader";
import PersonalInformationCard from "@/components/sales/profile/PersonalInformationCard";
import ChangePasswordCard from "@/components/sales/profile/ChangePasswordCard";

export default async function SalespersonProfilePage() {
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

    // Formatted here on the server, with an explicit locale/timeZone, so
    // the string is identical no matter what timezone or ICU locale data
    // the server process happens to be running with vs. the visitor's
    // browser — avoids a hydration mismatch on this line (previously
    // formatted client-side via `.toLocaleDateString()` with no args,
    // which is affected by the *rendering* environment's local time).
    createdAt: profile.createdAt.toLocaleDateString("en-US", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
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
