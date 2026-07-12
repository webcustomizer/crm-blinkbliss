import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifyToken } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (token) {
    try {
      const user = await verifyToken(token);

      if (user.role === "ADMIN") {
        redirect("/admin/dashboard");
      }

      redirect("/sales/dashboard");
    } catch (error) {
      // Invalid/expired token — fall through and show the landing page
      console.log("Session check error:", error);
    }
  }

  return (
    <main className="min-h-screen bg-[#111111] text-[#D4AF37]">
      {/* Navbar */}
      <nav className="border-b border-[#D4AF37]/20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div
              className="
              relative
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              border-[#D4AF37]/30
              bg-black/40
              p-1.5
              shadow-[0_0_20px_rgba(212,175,55,0.15)]
              "
            >
              <Image
                src="/logo.png"
                alt="Blink and Bliss"
                width={36}
                height={36}
                className="h-full w-full object-contain"
                priority
              />
            </div>

            <h1 className="text-2xl font-bold tracking-wider sm:text-3xl">
              Blink & Bliss
            </h1>
          </div>

          <Link
            href="/login"
            className="rounded-lg border border-[#D4AF37] px-6 py-2 font-semibold transition-all duration-300 hover:bg-[#D4AF37] hover:text-[#111111]"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-[85vh] items-center justify-center px-8">
        <div className="max-w-4xl text-center">
          <div className="mb-8 flex justify-center">
            <div
              className="
              relative
              flex
              h-24
              w-24
              items-center
              justify-center
              rounded-3xl
              border
              border-[#D4AF37]/30
              bg-black/40
              p-3
              shadow-[0_0_40px_rgba(212,175,55,0.2)]
              "
            >
              <Image
                src="/logo.png"
                alt="Blink and Bliss"
                width={80}
                height={80}
                className="h-full w-full object-contain"
                priority
              />
            </div>
          </div>

          <p className="mb-4 uppercase tracking-[6px] text-[#B8860B]">
            Customer Relationship Management
          </p>

          <h1 className="mb-6 text-6xl font-extrabold leading-tight md:text-7xl">
            Blink & Bliss CRM
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 text-gray-300">
            A modern CRM platform to manage leads, assign salespeople, track
            follow-ups, and grow your business with confidence.
          </p>

          <Link
            href="/login"
            className="inline-block rounded-lg bg-[#D4AF37] px-10 py-4 text-lg font-bold text-[#111111] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(212,175,55,0.45)]"
          >
            Login to Dashboard
          </Link>
        </div>
      </section>

      {/* Bottom Line */}
      <footer className="border-t border-[#D4AF37]/20 py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()}{" "}
        <span className="font-semibold text-[#D4AF37]">Blink & Bliss CRM</span>
      </footer>
    </main>
  );
}
