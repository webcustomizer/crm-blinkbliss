"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { validatePasswordStrength } from "@/lib/password-validator";

type Props = { onSuccess: () => void };

export default function AddSalespersonDialog({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
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

  async function addSalesperson() {
    if (!name || !email || !password) { toast.error("Name, email, and password are required."); return; }

    const validation = validatePasswordStrength(password, minLength, requireSpecial);
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/salespersons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.message); setLoading(false); return; }
    toast.success("Salesperson created successfully");
    setName(""); setEmail(""); setPassword(""); setPhone(""); setPwErrors([]);
    setOpen(false);
    onSuccess();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-[#D4AF37] text-black hover:bg-[#c79f27] gap-2 rounded-xl">
            <Plus size={16} /> Add Salesperson
          </Button>
        }
      />
      <DialogContent className="bg-[#181818] text-white border-yellow-600/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#D4AF37] text-xl">Add Salesperson</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-[#D4AF37]">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#111] text-white mt-1" placeholder="Full name" />
          </div>
          <div>
            <Label className="text-[#D4AF37]">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#111] text-white mt-1" placeholder="Email address" />
          </div>
          <div>
            <Label className="text-[#D4AF37]">Password</Label>
            <Input type="password" value={password} onChange={(e) => handlePasswordChange(e.target.value)} className="bg-[#111] text-white mt-1" placeholder="Password" />
            {pwErrors.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {pwErrors.map((err, i) => (
                  <li key={i} className="text-xs text-red-400">{err}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <Label className="text-[#D4AF37]">Phone (Optional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-[#111] text-white mt-1" placeholder="Phone number" />
          </div>
          <Button onClick={addSalesperson} disabled={loading} className="w-full bg-[#D4AF37] text-black hover:bg-[#c79f27]">
            {loading ? "Creating..." : "Create Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
