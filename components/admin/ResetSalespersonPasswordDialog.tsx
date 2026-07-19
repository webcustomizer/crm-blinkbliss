"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { validatePasswordStrength } from "@/lib/password-validator";

type Props = {
  user: {
    id: string;
    name: string;
  };
  open: boolean;
  setOpen: (v: boolean) => void;
};

export default function ResetSalespersonPasswordDialog({ user, open, setOpen }: Props) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pwErrors, setPwErrors] = useState<string[]>([]);

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

  function handlePasswordChange(val: string) {
    setPassword(val);
    const validation = validatePasswordStrength(val, minLength, requireSpecial);
    setPwErrors(validation.errors);
  }

  async function resetPassword() {
    if (!password) { toast.error("Please enter a password"); return; }

    const validation = validatePasswordStrength(password, minLength, requireSpecial);
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/admin/salespersons/${user.id}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.message); setLoading(false); return; }
    toast.success("Password reset successfully");
    setPassword(""); setPwErrors([]);
    setOpen(false);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-[#181818] text-white border-yellow-600/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#D4AF37] text-xl">Reset Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-5">
          <p className="text-gray-300">Reset password for <span className="font-semibold text-white">{user.name}</span></p>
          <div>
            <Label className="text-[#D4AF37]">Temporary Password</Label>
            <Input type="text" value={password} onChange={(e) => handlePasswordChange(e.target.value)} placeholder="Enter temporary password"
              className="mt-2 h-12 rounded-xl border border-[#D4AF37]/30 bg-[#0d0d0d] px-4 text-white placeholder:text-gray-500 shadow-inner focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50" />
            {pwErrors.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {pwErrors.map((err, i) => (
                  <li key={i} className="text-xs text-red-400">{err}</li>
                ))}
              </ul>
            )}
          </div>
          <Button onClick={resetPassword} disabled={loading} className="w-full bg-[#D4AF37] text-black hover:bg-[#c79f27]">
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
