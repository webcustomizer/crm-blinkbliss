"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import LeadForm from "./LeadForm";
import { LeadFormData } from "@/types/lead";

function detectSource(): string | null {
  if (typeof window === "undefined") return null;

  // Production Vercel URL is always shared via WhatsApp
  if (window.location.hostname.includes("crm-blinkbliss.vercel.app")) {
    return "whatsapp";
  }

  const p = new URLSearchParams(window.location.search);

  // 1. Explicit ?source=X
  const explicit = p.get("source");
  if (explicit) return explicit.toLowerCase().trim();

  // 2. ?utm_source=X
  const utm = p.get("utm_source");
  if (utm) return utm.toLowerCase().trim();

  // 3. Referrer — WhatsApp gets priority label
  try {
    if (document.referrer) {
      const ref = document.referrer.toLowerCase();
      if (ref.includes("whatsapp") || ref.includes("wa.me") || ref.includes("api.whatsapp")) {
        return "whatsapp";
      }
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (host) return host;
    }
  } catch {}

  return null;
}

export default function LeadFormCard() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    setSource(detectSource());
  }, []);

  async function handleSubmit(data: LeadFormData) {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/leads", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({ ...data, source }),
      });

      const json = await res.json();

      if (!json.success) {
        // Show it as a toast too (in case Toaster is mounted),
        // and return the real message so LeadForm can display it
        // inline as well.
        toast.error(json.message || "Failed to submit form.");
        return { success: false, message: json.message };
      }

      setSubmitted(true);
      return { success: true };
    } catch (error) {


      toast.error("Something went wrong.");
      return {
        success: false,
        message: "Something went wrong. Please try again.",
      };
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="
      relative
      flex
      flex-col
      items-center
      justify-center
      overflow-hidden
      rounded-3xl
      border
      border-[#D4AF37]/30
      bg-gradient-to-b
      from-[#1a1a1a]
      to-black
      p-10
      text-center
      shadow-2xl
      shadow-[#D4AF37]/10
      md:p-16
      "
      >
        {/* Decorative glow */}
        <div
          className="
        pointer-events-none
        absolute
        -top-24
        left-1/2
        h-64
        w-64
        -translate-x-1/2
        rounded-full
        bg-[#D4AF37]/20
        blur-3xl
        "
        />

        <div className="relative mb-6 h-20 w-20 md:h-24 md:w-24">
          <Image
            src="/logo.png"
            alt="Blink and Bliss"
            fill
            className="object-contain"
            priority
          />
        </div>

        <div
          className="
  relative
  mb-8
  flex
  h-28
  w-28
  items-center
  justify-center
  rounded-full
  bg-gradient-to-br
  from-green-500/20
  to-green-500/5
  ring-1
  ring-green-500/40
  ring-offset-4
  ring-offset-black
  "
        >
          <div
            className="
    absolute
    inset-0
    animate-ping
    rounded-full
    bg-green-500/10
    "
          />
          <CheckCircle2
            size={56}
            strokeWidth={1.75}
            className="relative text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"
          />
        </div>

        <span
          className="
  mb-3
  rounded-full
  border
  border-[#D4AF37]/30
  bg-[#D4AF37]/10
  px-4
  py-1
  text-xs
  font-semibold
  uppercase
  tracking-widest
  text-[#D4AF37]
  "
        >
          Application Received
        </span>

        <h2
          className="
        relative
        bg-gradient-to-b
        from-[#f2d478]
        to-[#D4AF37]
        bg-clip-text
        text-4xl
        font-bold
        text-transparent
        md:text-5xl
        "
        >
          Thank You!
        </h2>

        <p
          className="
        relative
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
        relative
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
        relative
        mt-10
        rounded-xl
        bg-gradient-to-r
        from-[#D4AF37]
        to-[#c89d1d]
        px-8
        py-3
        font-semibold
        text-black
        shadow-lg
        shadow-[#D4AF37]/20
        transition
        hover:scale-105
        hover:shadow-[#D4AF37]/40
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
        <div className="mx-auto mb-4 relative h-20 w-20">
          <Image
            src="/logo.png"
            alt="Blink and Bliss"
            fill
            className="object-contain"
            priority
          />
        </div>

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
