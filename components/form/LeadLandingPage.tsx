"use client";

import LeadFormCard from "./LeadFormCard";

export default function LeadLandingPage() {
  return (
    <main className="min-h-screen  flex items-center justify-center bg-[#090909] py-20 md:p-4">
      {/* Form Container */}
      <div
        className="
        w-full
        max-w-4xl
        bg-[#111111]/90
        p-4
        shadow-2xl

        md:rounded-[30px]
        md:border
        md:border-[#D4AF37]/20
        md:p-8
        md:backdrop-blur-xl
        "
      >
        <LeadFormCard />
      </div>
    </main>
  );
}
