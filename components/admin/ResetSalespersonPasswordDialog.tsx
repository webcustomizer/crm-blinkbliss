"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  salespersonId: string;
  salespersonName: string;
};

export default function ResetSalespersonPasswordDialog({
  salespersonId,
  salespersonName,
}: Props) {
  const [open, setOpen] = useState(false);

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function resetPassword() {
    if (!password) {
      toast.error("Please enter a password");
      return;
    }

    setLoading(true);

    const res = await fetch(
      `/api/admin/salespersons/${salespersonId}/reset-password`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          password,
        }),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message);

      setLoading(false);

      return;
    }

    toast.success("Password reset successfully");

    setPassword("");

    setOpen(false);

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="
            text-yellow-400
            hover:text-yellow-300
            cursor-pointer
            "
          />
        }
      >
        <KeyRound size={18} />
      </DialogTrigger>

      <DialogContent
        className="
        bg-[#181818]
        text-white
        border-yellow-600/30
        "
      >
        <DialogHeader>
          <DialogTitle
            className="
            text-[#D4AF37]
            text-xl
            "
          >
            Reset Password
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-5">
          <p className="text-gray-300">
            Reset password for{" "}
            <span className="font-semibold text-white">{salespersonName}</span>
          </p>

          <div>
            <Label className="text-[#D4AF37]">Temporary Password</Label>

            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter temporary password"
              className="
  mt-2
  h-12
  rounded-xl
  border
  border-[#D4AF37]/30
  bg-[#0d0d0d]
  px-4
  text-white
  placeholder:text-gray-500
  shadow-inner
  transition
  focus:border-[#D4AF37]
  focus:ring-1
  focus:ring-[#D4AF37]/50
  "
            />
          </div>

          <Button
            onClick={resetPassword}
            disabled={loading}
            className="
            w-full
            bg-[#D4AF37]
            text-black
            hover:bg-[#c79f27]
            "
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
