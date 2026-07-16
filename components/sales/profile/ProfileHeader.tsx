"use client";

import { CalendarDays, ShieldCheck, UserRound } from "lucide-react";

interface ProfileHeaderProps {
  profile: {
    name: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const initials = profile.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="
      overflow-hidden
      rounded-3xl
      border
      border-[#D4AF37]/20
      bg-[#111111]
      p-6
      shadow-xl
      "
    >
      <div
        className="
        flex
        flex-col
        items-center
        gap-5
        sm:flex-row
        "
      >
        {/* Avatar */}

        <div
          className="
          flex
          h-24
          w-24
          shrink-0
          items-center
          justify-center
          rounded-full
          border
          border-[#D4AF37]/40
          bg-[#D4AF37]/10
          text-3xl
          font-bold
          text-[#D4AF37]
          shadow-lg
          "
        >
          {initials}
        </div>

        {/* Info */}

        <div
          className="
          flex-1
          text-center
          sm:text-left
          "
        >
          <h1
            className="
            text-2xl
            font-bold
            text-white
            "
          >
            {profile.name}
          </h1>

          <div
            className="
            mt-3
            flex
            flex-wrap
            justify-center
            gap-2
            sm:justify-start
            "
          >
            {/* Role */}

            <span
              className="
              flex
              items-center
              gap-1
              rounded-full
              border
              border-[#D4AF37]/30
              bg-[#D4AF37]/10
              px-3
              py-1
              text-xs
              font-semibold
              text-[#D4AF37]
              "
            >
              <ShieldCheck size={14} />
              Sales Executive
            </span>

            {/* Status */}

            <span
              className="
              flex
              items-center
              gap-1
              rounded-full
              border
              border-green-500/20
              bg-green-500/10
              px-3
              py-1
              text-xs
              font-semibold
              text-green-400
              "
            >
              <UserRound size={14} />

              {profile.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div
            className="
            mt-4
            flex
            items-center
            justify-center
            gap-2
            text-xs
            text-gray-500
            sm:justify-start
            "
          >
            <CalendarDays size={14} />
            Joined {new Date(profile.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
