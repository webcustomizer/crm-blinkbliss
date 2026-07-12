import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#111111] text-[#D4AF37]">
      {/* Navbar */}
      <nav className="border-b border-[#D4AF37]/20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">
          <h1 className="text-3xl font-bold tracking-wider">Blink & Bliss</h1>

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
