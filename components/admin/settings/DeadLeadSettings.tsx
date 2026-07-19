"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DeadLeadSettings() {
  const [loading, setLoading] = useState(false);

  async function processDeadLeads() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/leads/process-dead", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {


      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
rounded-2xl
border
border-[#D4AF37]/20
bg-[#111111]
p-6
"
    >
      <h2
        className="
text-xl
font-bold
text-[#D4AF37]
"
      >
        Expired Leads Management
      </h2>

      <p
        className="
mt-2
text-sm
text-gray-400
"
      >
        Move leads to DEAD status after maximum follow ups and expiry period.
      </p>

      <button
        onClick={processDeadLeads}
        disabled={loading}
        className="
mt-5
flex
items-center
gap-2
rounded-xl
bg-red-600
px-5
py-3
font-semibold
text-white
hover:bg-red-700
disabled:opacity-50
"
      >
        <Trash2 size={18} />

        {loading ? "Processing..." : "Process Expired Leads"}
      </button>
    </div>
  );
}
