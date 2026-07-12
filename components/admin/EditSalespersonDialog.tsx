"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  salesperson: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
};

export default function EditSalespersonDialog({ salesperson }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [name, setName] = useState(salesperson.name);
  const [email, setEmail] = useState(salesperson.email);
  const [phone, setPhone] = useState(salesperson.phone || "");

  const [loading, setLoading] = useState(false);

  async function updateSalesperson() {
    setLoading(true);

    const res = await fetch(`/api/admin/salespersons/${salesperson.id}`, {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        name,
        email,
        phone,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message);

      setLoading(false);

      return;
    }

    toast.success("Salesperson updated successfully");

    setOpen(false);

    router.refresh();

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Pencil
          size={18}
          className="
          text-yellow-400
          hover:text-yellow-300
          cursor-pointer
          "
        />
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
            Edit Salesperson
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-5">
          <div>
            <Label className="text-[#D4AF37]">Name</Label>

            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="
              bg-[#111]
              text-white
              "
            />
          </div>

          <div>
            <Label className="text-[#D4AF37]">Email</Label>

            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
              bg-[#111]
              text-white
              "
            />
          </div>

          <div>
            <Label className="text-[#D4AF37]">Phone</Label>

            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="
              bg-[#111]
              text-white
              "
            />
          </div>

          <Button
            onClick={updateSalesperson}
            disabled={loading}
            className="
            w-full
            bg-[#D4AF37]
            text-black
            hover:bg-[#c79f27]
            "
          >
            {loading ? "Updating..." : "Update Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
