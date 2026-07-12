"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
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
        router.push("/admin/dashboard");
      } else {
        router.push("/sales/dashboard");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border border-[#D4AF37]/30 bg-[#181818] shadow-2xl shadow-yellow-500/10">
      <CardContent className="p-8">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-wide text-[#D4AF37]">
            Blink & Bliss
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Welcome back! Sign in to continue.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37]"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          {error && <p className="text-red-500">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full bg-[#D4AF37] text-lg font-semibold text-black transition hover:bg-[#c79f27]"
          >
            {loading ? "Signing In..." : "Login"}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 border-t border-[#D4AF37]/20 pt-5 text-center">
          <Link
            href="/"
            className="text-sm text-gray-400 transition hover:text-[#D4AF37]"
          >
            ← Back to Home
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
