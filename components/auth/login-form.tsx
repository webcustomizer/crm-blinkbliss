"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message);
        return;
      }

      if (data.user.role === "ADMIN") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/sales/dashboard");
      }
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[#0a0a0a]">
      {/* ================= LEFT — Branding Panel (desktop only) ================= */}
      <div
        className="
        relative
        hidden
        w-1/2
        flex-col
        justify-between
        overflow-hidden
        border-r
        border-[#D4AF37]/10
        bg-[#0d0d0d]
        p-14

        lg:flex
        "
      >
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-[100px]" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#D4AF37]/10 blur-[100px]" />
          <div
            className="
            absolute
            inset-0
            opacity-[0.03]
            [background-image:linear-gradient(#D4AF37_1px,transparent_1px),linear-gradient(90deg,#D4AF37_1px,transparent_1px)]
            [background-size:48px_48px]
            "
          />
        </div>

        {/* Top: small brand mark */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative h-10 w-10">
            <Image
              src="/logo.png"
              alt="Blink and Bliss"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-lg font-semibold tracking-wide text-[#D4AF37]">
            Blink & Bliss
          </span>
        </div>

        {/* Middle: big logo + message */}
        <div className="relative z-10 flex flex-col items-start">
          <div className="relative mb-8 h-40 w-40 xl:h-48 xl:w-48">
            <Image
              src="/logo.png"
              alt="Blink and Bliss"
              fill
              className="object-contain drop-shadow-[0_0_35px_rgba(212,175,55,0.25)]"
              priority
            />
          </div>

          <div className="mb-4 flex items-center gap-2 text-[#D4AF37]">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-[0.2em]">
              Admin Portal
            </span>
          </div>

          <h2 className="max-w-md text-4xl font-bold leading-tight text-white xl:text-5xl">
            Manage your{" "}
            <span
              className="
              bg-gradient-to-r
              from-[#e8cf7a]
              via-[#D4AF37]
              to-[#b8912b]
              bg-clip-text
              text-transparent
              "
            >
              business with elegance.
            </span>
          </h2>

          <p className="mt-5 max-w-sm text-base leading-7 text-gray-400">
            Access leads, track performance, and grow your brand — all from one
            beautifully simple dashboard.
          </p>
        </div>

        {/* Bottom: footer note */}
        <p className="relative z-10 text-xs text-gray-600">
          © {new Date().getFullYear()} Blink & Bliss. All rights reserved.
        </p>
      </div>

      {/* ================= RIGHT — Form Panel ================= */}
      <div
        className="
        relative
        flex
        w-full
        items-center
        justify-center
        overflow-hidden
        px-4
        py-10

        sm:px-6

        lg:w-1/2
        lg:px-12
        xl:px-20
        "
      >
        {/* Mobile-only ambient glow */}
        <div className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#D4AF37]/5 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Logo — mobile/tablet only, hidden on desktop since left panel shows it */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div
              className="
              relative
              mb-4
              flex
              h-24
              w-24
              items-center
              justify-center
              rounded-full
              bg-[#D4AF37]/5
              ring-1
              ring-[#D4AF37]/20

              sm:h-28
              sm:w-28
              "
            >
              <div className="relative h-16 w-16 sm:h-20 sm:w-20">
                <Image
                  src="/logo.png"
                  alt="Blink and Bliss"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <h1
              className="
              bg-gradient-to-r
              from-[#e8cf7a]
              via-[#D4AF37]
              to-[#b8912b]
              bg-clip-text
              text-3xl
              font-bold
              tracking-wide
              text-transparent

              sm:text-4xl
              "
            >
              Blink & Bliss
            </h1>
          </div>

          {/* Heading — desktop only */}
          <div className="mb-10 hidden lg:block">
            <h1 className="text-3xl font-bold text-white xl:text-4xl">
              Welcome back
            </h1>
            <p className="mt-2 text-gray-400">
              Sign in to access your dashboard.
            </p>
          </div>

          {/* Heading — mobile only */}
          <p className="mb-6 text-center text-sm text-gray-400 lg:hidden">
            Welcome back! Sign in to continue.
          </p>

          <form
            className="
            space-y-5
            rounded-3xl
            border
            border-[#D4AF37]/20
            bg-[#141414]/80
            p-6
            shadow-2xl
            shadow-black/50
            backdrop-blur-xl

            sm:p-8

            lg:border-0
            lg:bg-transparent
            lg:p-0
            lg:shadow-none
            lg:backdrop-blur-none
            "
            onSubmit={handleLogin}
          >
            {/* Email */}
            <div className="space-y-2">
              <Label className="text-[#D4AF37]">Email</Label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#D4AF37]" />

                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@blink.com"
                  className="h-12 border-[#D4AF37]/30 bg-[#111111] pl-10 text-white placeholder:text-gray-500 focus-visible:ring-[#D4AF37]"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-[#D4AF37]">Password</Label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#D4AF37]" />

                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-[#D4AF37]/30 bg-[#111111] pl-10 pr-12 text-white placeholder:text-gray-500 focus-visible:ring-[#D4AF37]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] transition hover:text-[#e8cf7a]"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="
              h-12
              w-full
              bg-gradient-to-r
              from-[#e8cf7a]
              via-[#D4AF37]
              to-[#b8912b]
              text-lg
              font-semibold
              text-black
              shadow-lg
              shadow-[#D4AF37]/20
              transition
              hover:scale-[1.02]
              hover:shadow-[#D4AF37]/30
              disabled:opacity-60
              disabled:hover:scale-100
              "
            >
              {loading ? "Signing In..." : "Login"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 border-t border-[#D4AF37]/20 pt-5 text-center lg:border-[#D4AF37]/10">
            <Link
              href="/"
              className="
              inline-flex
              items-center
              gap-1.5
              text-sm
              text-gray-400
              transition
              hover:text-[#D4AF37]
              "
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
