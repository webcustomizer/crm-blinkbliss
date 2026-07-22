"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

type Props = {
  leadId: string;
};

export default function FollowUpDialog({ leadId }: Props) {
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [remarks, setRemarks] = useState("");

  const [nextFollowUp, setNextFollowUp] = useState("");

  async function handleSave() {
    try {
      setLoading(true);

      const response = await fetch(`/api/admin/leads/${leadId}/followups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          remarks,
          nextFollowUp,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      toast.success("Follow up added successfully.");

      setRemarks("");

      setNextFollowUp("");

      setOpen(false);
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
            variant="outline"
            className="
            border-[#D4AF37]/30
            text-[#D4AF37]
            hover:bg-[#D4AF37]/10
            "
          >
            <CalendarDays size={16} />
            Follow Up
          </Button>
        }
      />

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Follow Up</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-gray-300">Remarks</label>

            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter customer remarks..."
              className="
              min-h-28
              w-full
              rounded-xl
              border
              border-[#D4AF37]/20
              bg-black
              p-3
              text-white
              outline-none
              focus:border-[#D4AF37]
              "
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Next Follow Up
            </label>

            <input
              type="datetime-local"
              value={nextFollowUp}
              onChange={(e) => setNextFollowUp(e.target.value)}
              className="
              w-full
              rounded-xl
              border
              border-[#D4AF37]/20
              bg-black
              p-3
              text-white
              "
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={loading}
            className="
            w-full
            bg-[#D4AF37]
            text-black
            hover:bg-[#c79f27]
            "
          >
            {loading ? "Saving..." : "Save Follow Up"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
