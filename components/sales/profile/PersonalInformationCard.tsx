"use client";

import { Mail, Phone, ShieldCheck } from "lucide-react";

interface PersonalInformationCardProps {
  profile: {
    name: string;
    email: string;
    phone?: string | null;
    role: string;
    isActive: boolean;
  };
}

export default function PersonalInformationCard({
  profile,
}: PersonalInformationCardProps) {
  return (
    <div
      className="
      rounded-3xl
      border
      border-[#D4AF37]/20
      bg-[#111111]
      p-6
      shadow-xl
      "
    >
      <h2
        className="
        mb-6
        text-lg
        font-bold
        text-white
        "
      >
        Personal Information
      </h2>

      <div
        className="
        space-y-4
        "
      >
        {/* Email */}

        <div
          className="
          flex
          items-center
          gap-4
          rounded-2xl
          border
          border-white/10
          bg-black/20
          p-4
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
            <Mail size={20} />
          </div>

          <div>
            <p
              className="
              text-xs
              text-gray-500
              "
            >
              Email Address
            </p>

            <p
              className="
              mt-1
              break-all
              text-sm
              font-medium
              text-white
              "
            >
              {profile.email}
            </p>
          </div>
        </div>

        {/* Phone */}

        <div
          className="
          flex
          items-center
          gap-4
          rounded-2xl
          border
          border-white/10
          bg-black/20
          p-4
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
            <Phone size={20} />
          </div>

          <div>
            <p
              className="
              text-xs
              text-gray-500
              "
            >
              Phone Number
            </p>

            <p
              className="
              mt-1
              text-sm
              font-medium
              text-white
              "
            >
              {profile.phone || "Not provided"}
            </p>
          </div>
        </div>

        {/* Role */}

        <div
          className="
          flex
          items-center
          gap-4
          rounded-2xl
          border
          border-white/10
          bg-black/20
          p-4
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
            <ShieldCheck size={20} />
          </div>

          <div>
            <p
              className="
              text-xs
              text-gray-500
              "
            >
              Account Role
            </p>

            <p
              className="
              mt-1
              text-sm
              font-medium
              text-white
              "
            >
              Sales Executive
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
