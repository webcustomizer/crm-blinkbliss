"use client";

import LeadFormCard from "./LeadFormCard";

export default function LeadLandingPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-[#090909] py-6 md:items-center md:py-20 md:p-4">
      {/* Form Container */}
      <div
        className="
        w-full
        max-w-4xl
        bg-[#111111]/90
        px-[1px]
        py-4
        shadow-2xl

        md:rounded-[30px]
        md:border
        md:border-[#D4AF37]/20
        md:px-8
        md:py-8
        md:backdrop-blur-xl
        "
      >
        <LeadFormCard />
      </div>
    </main>
  );
}
