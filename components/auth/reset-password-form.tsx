"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock, CheckCircle2, Eye, EyeOff, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function isInApp(): boolean {
  if (typeof window === "undefined") return false;
  // @ts-expect-error Capacitor injects this on native platform
  return !!window.Capacitor?.isNativePlatform?.();
}

function ResetFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const email = params.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !email) setError("Invalid or missing reset link.");
  }, [token, email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: password }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        if (isInApp()) {
          setTimeout(() => router.push("/login"), 3000);
        }
      }
      else setError(data.message);
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  if (done) {
    if (isInApp()) {
      return (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#141414] p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
          <h2 className="text-lg font-semibold text-white mb-2">Password Reset!</h2>
          <p className="text-gray-400 text-sm">Redirecting to login...</p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#141414] p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
        <h2 className="text-lg font-semibold text-white mb-2">Password Reset!</h2>
        <p className="text-gray-400 text-sm mb-5">Your password has been updated successfully.</p>
        <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] p-4 flex items-center gap-3">
          <Smartphone size={20} className="text-[#D4AF37] shrink-0" />
          <p className="text-sm text-[#D4AF37]/80 text-left">Open the <span className="font-semibold text-[#D4AF37]">Blink &amp; Bliss</span> app to login with your new password.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[#D4AF37]/20 bg-[#141414] p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-white mb-1">Set New Password</h2>
      <p className="text-gray-400 text-sm mb-6">Enter your new password below.</p>

      <div className="space-y-4 mb-5">
        <div className="space-y-2">
          <Label className="text-[#D4AF37]">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37]" />
            <Input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-12 border-[#D4AF37]/30 bg-[#111] pl-10 pr-12 text-white" placeholder="Min 8 characters" autoFocus />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37]">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[#D4AF37]">Confirm Password</Label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 border-[#D4AF37]/30 bg-[#111] px-4 text-white" placeholder="Re-enter password" />
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{error}</p>}

      <Button type="submit" disabled={loading || !token}
        className="h-12 w-full bg-[#D4AF37] text-black font-semibold hover:bg-[#c79f27] disabled:opacity-60">
        {loading ? "Resetting..." : "Reset Password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordForm() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-16 w-16 relative">
            <Image src="/logo.png" alt="Blink & Bliss" fill className="object-contain" priority />
          </div>
          <h1 className="text-xl font-bold text-[#D4AF37]">Blink & Bliss</h1>
        </div>
        <Suspense fallback={<div className="text-center text-gray-400">Loading...</div>}>
          <ResetFormInner />
        </Suspense>
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-gray-400 hover:text-[#D4AF37] inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
