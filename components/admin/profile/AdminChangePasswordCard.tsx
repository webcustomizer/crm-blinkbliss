"use client";

import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function AdminChangePasswordCard({ forceChange = false }: { forceChange?: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [minLength, setMinLength] = useState(8);
  const [requireSpecial, setRequireSpecial] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setMinLength(j.data.passwordMinLength || 8);
          setRequireSpecial(j.data.passwordRequireSpecial || false);
        }
      })
      .catch(() => {});
  }, []);

  function validatePassword(pw: string): string | null {
    if (pw.length < minLength) return `Password must be at least ${minLength} characters`;
    if (requireSpecial) {
      if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter";
      if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter";
      if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw))
        return "Password must contain at least one special character";
    }
    return null;
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    const validationError = validatePassword(newPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Password update failed");
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (forceChange) {
        toast.info("Redirecting to dashboard...");
        setTimeout(() => { window.location.href = "/admin/dashboard"; }, 1500);
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-[#D4AF37]/20 bg-[#111111] p-6 shadow-xl">
      {forceChange && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">Password change required</p>
            <p className="mt-1 text-xs text-amber-400/80">You must change your password before continuing. This is a one-time requirement.</p>
          </div>
        </div>
      )}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37]">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Change Password</h2>
          <p className="text-sm text-gray-400">Update your account security</p>
        </div>
      </div>

      <div className="space-y-1 mb-3 text-[11px] text-gray-500">
        <p>Min {minLength} characters{requireSpecial ? ", uppercase, lowercase, number, special character" : ""}</p>
      </div>

      <div className="space-y-4">
        <PasswordInput label="Current Password" value={currentPassword} setValue={setCurrentPassword} show={showCurrent} setShow={setShowCurrent} />
        <PasswordInput label="New Password" value={newPassword} setValue={setNewPassword} show={showNew} setShow={setShowNew} />
        <PasswordInput label="Confirm New Password" value={confirmPassword} setValue={setConfirmPassword} show={showConfirm} setShow={setShowConfirm} />

        <button
          onClick={handleChangePassword}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-[#D4AF37] py-3 text-sm font-semibold text-black transition hover:bg-[#E5C158] disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}

function PasswordInput({ label, value, setValue, show, setShow }: { label: string; value: string; setValue: (v: string) => void; show: boolean; setShow: (v: boolean) => void }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-gray-400">{label}</label>
      <div className="relative">
        <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-12 text-sm text-white outline-none transition focus:border-[#D4AF37]/50"
          placeholder="Enter password"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label="Toggle password visibility"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#D4AF37]"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
