"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import LeadForm from "./LeadForm";

import { createLead } from "@/lib/api/leads";
import { LeadFormData } from "@/types/lead";

type Props = {
  onLeadCreated?: () => void;
};

export default function LeadDialog({ onLeadCreated }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: LeadFormData) {
    try {
      setLoading(true);

      await createLead(data);

      toast.success("Lead created successfully.");

      onLeadCreated?.();

      setOpen(false);

      router.refresh();
    } catch (error) {


      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            className="
              bg-[#D4AF37]
              text-black
              hover:bg-[#c79f27]
            "
          />
        }
      >
        <Plus size={18} />
        Add Lead
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>

        <LeadForm onSubmit={handleSubmit} loading={loading} />
      </DialogContent>
    </Dialog>
  );
}
