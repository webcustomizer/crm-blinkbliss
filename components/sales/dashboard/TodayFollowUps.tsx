"use client";

import { useEffect, useState } from "react";
import { Phone, Clock } from "lucide-react";

interface FollowUp {
  id: string;
  name: string | null;
  phone: string;
  status: string;
  remarks: string | null;
  nextFollowUp: string | null;
}

// Simple inline WhatsApp glyph (lucide-react has no official WhatsApp icon)
function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.5 0 .18 5.32.18 11.88c0 2.09.55 4.13 1.6 5.93L0 24l6.35-1.66a11.86 11.86 0 0 0 5.7 1.45h.01c6.56 0 11.88-5.32 11.88-11.88 0-3.17-1.24-6.15-3.42-8.43ZM12.06 21.6a9.7 9.7 0 0 1-4.95-1.36l-.35-.21-3.77.99 1-3.67-.23-.38a9.72 9.72 0 0 1-1.49-5.09c0-5.38 4.38-9.76 9.8-9.76a9.7 9.7 0 0 1 6.9 2.87 9.7 9.7 0 0 1 2.87 6.9c0 5.39-4.38 9.71-9.78 9.71Zm5.36-7.29c-.29-.15-1.73-.86-2-.95-.27-.1-.46-.15-.66.14-.2.29-.76.95-.93 1.15-.17.19-.34.22-.63.07-.29-.15-1.23-.45-2.34-1.44-.87-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.5.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.15-.66-1.58-.9-2.17-.24-.57-.48-.49-.66-.5h-.56c-.19 0-.5.07-.76.36-.26.29-1 1-1 2.42 0 1.43 1.02 2.81 1.17 3 .15.19 2 3.05 4.85 4.28.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.73-.71 1.98-1.39.24-.68.24-1.27.17-1.39-.07-.12-.26-.19-.55-.34Z" />
    </svg>
  );
}

// Attempts to open WhatsApp for this number; if the app/web WhatsApp
// doesn't actually open within a short window, falls back to a normal
// phone call. There's no public way to confirm WhatsApp registration
// ahead of time, so this is a best-effort heuristic, not a guarantee.
function smartCall(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  const waUrl = `https://wa.me/${cleaned}`;
  const telUrl = `tel:${phone}`;

  let appOpened = false;
  const markOpened = () => {
    appOpened = true;
  };

  window.addEventListener("blur", markOpened, { once: true });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) markOpened();
    },
    { once: true },
  );

  window.location.href = waUrl;

  window.setTimeout(() => {
    window.removeEventListener("blur", markOpened);
    if (!appOpened) {
      window.location.href = telUrl;
    }
  }, 1200);
}

export default function TodayFollowUps() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFollowUps() {
      try {
        const res = await fetch("/api/salesperson/dashboard/followups", {
          cache: "no-store",
        });

        const data = await res.json();

        if (res.ok) {
          setFollowUps(data.followUps);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }

    loadFollowUps();
  }, []);

  return (
    <div
      className="
      w-full
      rounded-2xl
      border
      border-[#D4AF37]/20
      bg-[#161616]
      p-4
      "
    >
      {/* Header */}
      <div
        className="
        flex
        items-center
        justify-between
        "
      >
        <h2 className="text-base font-semibold text-white sm:text-lg">
          Today&apos;s Follow Ups
        </h2>

        <Clock size={20} className="text-[#D4AF37]" />
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-zinc-400">Loading follow ups...</p>
      ) : followUps.length === 0 ? (
        <p className="mt-5 text-sm text-zinc-400">No follow ups for today 🎉</p>
      ) : (
        <div
          className="
  mt-4
  max-h-[420px]
  space-y-3
  overflow-y-auto
  overflow-x-hidden
  "
        >
          {followUps.map((lead) => (
            <div
              key={lead.id}
              className="
              group
              rounded-xl
              border
              border-[#D4AF37]/10
              bg-gradient-to-b
              from-[#141414]
              to-[#0d0d0d]
              p-3.5
              transition-colors
              duration-300
              hover:border-[#D4AF37]/25
              "
            >
              {/* Name + Status */}
              <div
                className="
                flex
                items-start
                justify-between
                gap-2
                "
              >
                <div className="min-w-0">
                  <p
                    className="
                    truncate
                    text-sm
                    font-semibold
                    tracking-wide
                    text-white
                    "
                  >
                    {lead.name || "Unknown Lead"}
                  </p>

                  <p
                    className="
                    mt-1.5
                    flex
                    items-center
                    gap-1.5
                    text-xs
                    text-zinc-500
                    "
                  >
                    <Phone size={12} className="text-zinc-600" />

                    {lead.phone}
                  </p>
                </div>

                <span
                  className="
                  shrink-0
                  rounded-full
                  border
                  border-[#D4AF37]/20
                  bg-[#D4AF37]/[0.08]
                  px-2.5
                  py-1
                  text-[10px]
                  font-medium
                  uppercase
                  tracking-wider
                  text-[#D4AF37]
                  "
                >
                  {lead.status}
                </span>
              </div>

              {/* Divider */}
              <div className="my-3 h-px bg-gradient-to-r from-[#D4AF37]/15 via-[#D4AF37]/5 to-transparent" />

              {/* Date + Call button */}
              <div
                className="
                flex
                items-center
                justify-between
                gap-2
                "
              >
                <div
                  className="
                  flex
                  items-center
                  gap-1.5
                  text-xs
                  text-zinc-500
                  "
                >
                  <Clock size={12} className="text-zinc-600" />

                  <span>
                    {lead.nextFollowUp
                      ? new Date(lead.nextFollowUp).toLocaleString()
                      : "No follow up"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => smartCall(lead.phone)}
                  title="Call (via WhatsApp if available)"
                  className="
                  inline-flex
                  shrink-0
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-[#D4AF37]/25
                  bg-gradient-to-b
                  from-[#1e1e1e]
                  to-[#151515]
                  py-1.5
                  pl-2
                  pr-3.5
                  text-xs
                  font-medium
                  tracking-wide
                  text-[#e8e8e8]
                  shadow-sm
                  transition-all
                  duration-300
                  hover:border-[#D4AF37]/50
                  hover:shadow-[0_0_14px_rgba(212,175,55,0.18)]
                  active:scale-95
                  "
                >
                  <span
                    className="
                    flex
                    h-5
                    w-5
                    items-center
                    justify-center
                    rounded-full
                    bg-[#25D366]/15
                    text-[#25D366]
                    "
                  >
                    <WhatsAppIcon size={11} />
                  </span>
                  Call
                </button>
              </div>

              {lead.remarks && (
                <p
                  className="
                  mt-3
                  line-clamp-2
                  text-xs
                  leading-relaxed
                  text-zinc-500
                  "
                >
                  {lead.remarks}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
