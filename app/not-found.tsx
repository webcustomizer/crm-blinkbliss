import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { verifyToken } from "@/lib/auth";

function getHomePath(role?: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "TEAM_LEAD":
      return "/team-leader/dashboard";
    case "SALESPERSON":
      return "/sales/dashboard";
    default:
      return "/login";
  }
}

export default async function NotFound() {
  let homePath = "/login";

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (token) {
      const payload = await verifyToken(token);
      homePath = getHomePath(payload.role);
    }
  } catch {
    homePath = "/login";
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0b0b] px-6">
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/10 blur-[140px]" />

      <div className="relative w-full max-w-lg rounded-[32px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#1b1b1b] via-[#141414] to-[#0c0c0c] p-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[32px] border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.15)]">
          <ShieldAlert size={55} aria-hidden="true" />
        </div>

        <h1 className="mt-8 text-8xl font-black tracking-tight text-[#D4AF37]">
          404
        </h1>
        <h2 className="mt-3 text-2xl font-bold text-white">Page Not Found</h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-gray-400">
          The page you are looking for doesn&apos;t exist or may have been
          moved inside the CRM system.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href={homePath}
            aria-label="Go back to dashboard"
            className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#c79b28] px-7 py-3.5 font-semibold text-black shadow-[0_10px_30px_rgba(212,175,55,0.25)] transition hover:shadow-[0_15px_40px_rgba(212,175,55,0.35)]"
          >
            <ArrowLeft
              size={19}
              className="transition-transform group-hover:-translate-x-1"
              aria-hidden="true"
            />
            Back to dashboard
          </Link>
        </div>

        <div className="mt-8 border-t border-white/10 pt-5 text-xs uppercase tracking-[0.25em] text-gray-600">
          Blink &amp; Bliss CRM
        </div>
      </div>
    </div>
  );
}
