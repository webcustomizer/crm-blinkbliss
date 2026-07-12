"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import LeadForm from "./LeadForm";
import { LeadFormData } from "@/types/lead";

export default function LeadFormCard() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(data: LeadFormData) {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/leads", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!json.success) {
        toast.error(json.message || "Failed to submit form.");
        return;
      }

      setSubmitted(true);
    } catch (error) {
      console.log(error);

      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-10">
        <div
          className="
          mb-8
          flex
          h-28
          w-28
          items-center
          justify-center
          rounded-full
          bg-[#D4AF37]/10
          ring-8
          ring-[#D4AF37]/10
          "
        >
          <CheckCircle2 size={60} className="text-[#D4AF37]" />
        </div>

        <h2
          className="
          text-4xl
          font-bold
          text-[#D4AF37]
          "
        >
          Thank You!
        </h2>

        <p
          className="
          mt-5
          max-w-md
          text-lg
          leading-8
          text-gray-300
          "
        >
          Your information has been received successfully.
        </p>

        <p
          className="
          mt-3
          max-w-md
          text-gray-400
          "
        >
          One of our business consultants will contact you soon through WhatsApp
          or Phone Call.
        </p>

        <button
          onClick={() => location.reload()}
          className="
          mt-10
          rounded-xl
          bg-[#D4AF37]
          px-8
          py-3
          font-semibold
          text-black
          transition
          hover:scale-105
          "
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  return (
    <div
      className="
      rounded-3xl
      border
      border-[#D4AF37]/20
      bg-[#141414]
      p-5
      shadow-2xl
      shadow-black/30

      md:p-8
      "
    >
      <div className="mb-8 text-center">
        <h2
          className="
          text-3xl
          font-bold
          text-[#D4AF37]
          "
        >
          Register Now
        </h2>

        <p
          className="
          mt-3
          text-gray-400
          "
        >
          Fill in your details and we&apos;ll contact you shortly.
        </p>
      </div>

      {loading && (
        <div
          className="
          mb-6
          flex
          items-center
          justify-center
          gap-3
          rounded-xl
          border
          border-[#D4AF37]/20
          bg-[#D4AF37]/10
          p-3
          text-[#D4AF37]
          "
        >
          <Loader2 size={18} className="animate-spin" />
          Submitting your information...
        </div>
      )}

      <LeadForm loading={loading} onSubmit={handleSubmit} />
    </div>
  );
}
