"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AddSalespersonDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function createSalesperson() {
    setLoading(true);

    const res = await fetch("/api/admin/salespersons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message);

      setLoading(false);

      return;
    }

    toast.success("Salesperson created successfully");

    setOpen(false);

    setLoading(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="
  flex
  items-center
  gap-2
  rounded-md
  bg-[#D4AF37]
  px-4
  py-2
  font-semibold
  text-black
  hover:bg-[#c79f27]
  "
      >
        <Plus size={18} />
        Add Salesperson
      </DialogTrigger>
      <DialogContent
        className="
        border-yellow-600/20
        bg-[#181818]
        text-white
        "
      >
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#D4AF37]">
            Add New Salesperson
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-5">
          <div className="space-y-2">
            <Label className="text-[#D4AF37]">Full Name</Label>

            <Input
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="
              bg-[#111111]
              border-yellow-600/30
              text-white
              "
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#D4AF37]">Email</Label>

            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sales@blinkbliss.com"
              className="
              bg-[#111111]
              border-yellow-600/30
              text-white
              "
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#D4AF37]">Phone</Label>

            <Input
              placeholder="03001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="
              bg-[#111111]
              border-yellow-600/30
              text-white
              "
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#D4AF37]">Password</Label>

            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="
              bg-[#111111]
              border-yellow-600/30
              text-white
              "
            />
          </div>

          <Button
            onClick={createSalesperson}
            className="
            w-full
            bg-[#D4AF37]
            text-black
            hover:bg-[#c79f27]
            "
          >
            {loading ? "Creating..." : "Create Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
