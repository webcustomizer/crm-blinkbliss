"use client";

import LeadFormCard from "./LeadFormCard";

export default function LeadLandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#090909] p-4 py-20">
      {" "}
      {/* py-20 add kiya */}
      {/* Form Container */}
      <div className="w-full max-w-4xl rounded-[30px] border border-[#D4AF37]/20 bg-[#111111]/90 p-8 shadow-2xl backdrop-blur-xl">
        <LeadFormCard />
      </div>
    </main>
  );
}
