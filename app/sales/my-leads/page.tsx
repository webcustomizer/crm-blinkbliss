import { Suspense } from "react";
import MyLeads from "@/components/sales/my-leads/MyLeads"; // adjust path

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-[#D4AF37]">Loading...</div>}>
      <MyLeads />
    </Suspense>
  );
}
