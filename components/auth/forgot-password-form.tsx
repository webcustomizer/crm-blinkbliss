"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Please enter your email."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) setSent(true);
      else setError(data.message);
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-16 w-16 relative">
            <Image src="/logo.png" alt="Blink & Bliss" fill className="object-contain" priority />
          </div>
          <h1 className="text-xl font-bold text-[#D4AF37]">Blink & Bliss</h1>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#141414] p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
            <h2 className="text-lg font-semibold text-white mb-2">Check Your Email</h2>
            <p className="text-gray-400 text-sm">If an account exists for this email, you will receive a password reset link shortly.</p>
            <Link href="/login" className="mt-6 inline-block text-sm text-[#D4AF37] hover:text-[#e8cf7a]">← Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-[#D4AF37]/20 bg-[#141414] p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-1">Forgot Password</h2>
            <p className="text-gray-400 text-sm mb-6">Enter your email and we'll send you a reset link.</p>

            <div className="space-y-2 mb-5">
              <Label className="text-[#D4AF37]">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37]" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
                  className="h-12 border-[#D4AF37]/30 bg-[#111] pl-10 text-white placeholder:text-gray-500" autoFocus />
              </div>
            </div>

            {error && <p className="mb-4 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{error}</p>}

            <Button type="submit" disabled={loading}
              className="h-12 w-full bg-[#D4AF37] text-black font-semibold hover:bg-[#c79f27] disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? "Sending..." : <><Send size={16} /> Send Reset Link</>}
            </Button>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-gray-400 hover:text-[#D4AF37] inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
