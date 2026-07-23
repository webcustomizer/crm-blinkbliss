"use client";

import { useState, useMemo, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { LeadDetails } from "@/types/lead";

type EditLeadForm = {
  name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  purpose: string;
  status: string;
  remarks: string;
  isPriority: boolean;
};

type Props = {
  open: boolean;
  setOpen: (value: boolean) => void;
  lead: LeadDetails | null;
  onUpdate?: () => void;
};

export default function EditLeadDialog({
  open,
  setOpen,
  lead,
  onUpdate,
}: Props) {
  const [loading, setLoading] = useState(false);
  const initialForm = useMemo<EditLeadForm>(
    () => ({
      name: lead?.name ?? "",
      phone: lead?.phone ?? "",
      email: lead?.email ?? "",
      city: lead?.city ?? "",
      source: lead?.source ?? "",
      purpose: lead?.purpose ?? "",
      status: lead?.status ?? "NEW",
      remarks: lead?.remarks ?? "",
      isPriority: lead?.isPriority ?? false,
    }),
    [lead],
  );

  const [form, setForm] = useState<EditLeadForm>(initialForm);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  function change(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setForm((previous: EditLeadForm) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  }

  async function updateLead() {
    if (!lead?.id) {
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          city: form.city,
          purpose: form.purpose,
          status: form.status,
          remarks: form.remarks,
          source: form.source || null,
          assignedToId: lead.assignedTo?.id ?? null,
          isPriority: form.isPriority,
        }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success("Lead updated successfully");

        await onUpdate?.();
        setOpen(false);
      } else {
        toast.error(json.message || "Update failed");
      }
    } catch (error) {


      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
      }}
    >
      <DialogContent
        className="
        !max-w-[600px]
        bg-[#111111]
        border
        border-[#D4AF37]/30
        text-white
        "
      >
        <DialogHeader>
          <DialogTitle
            className="
            text-2xl
            text-[#D4AF37]
            "
          >
            Edit Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            name="name"
            value={form.name}
            onChange={change}
            placeholder="Name"
            className="
            w-full
            rounded-xl
            border
            border-[#D4AF37]/20
            bg-black/30
            p-3
            text-white
            "
          />

          <input
            name="phone"
            value={form.phone}
            onChange={change}
            placeholder="Phone"
            className="
            w-full
            rounded-xl
            border
            border-[#D4AF37]/20
            bg-black/30
            p-3
            text-white
            "
          />

          <input
            name="email"
            value={form.email}
            onChange={change}
            placeholder="Email"
            className="
            w-full
            rounded-xl
            border
            border-[#D4AF37]/20
            bg-black/30
            p-3
            text-white
            "
          />

          <input
            name="city"
            value={form.city}
            onChange={change}
            placeholder="City"
            className="
            w-full
            rounded-xl
            border
            border-[#D4AF37]/20
            bg-black/30
            p-3
            text-white
            "
          />

          <input
            name="source"
            value={form.source}
            onChange={change}
            placeholder="Source"
            className="
            w-full
            rounded-xl
            border
            border-[#D4AF37]/20
            bg-black/30
            p-3
            text-white
            "
          />

          <select
            name="status"
            value={form.status}
            onChange={change}
            className="
            w-full
            rounded-xl
            border
            border-[#D4AF37]/20
            bg-black/30
            p-3
            text-white
            "
          >
            <option value="NEW">NEW</option>

            <option value="CALLED">CALLED</option>

            <option value="NEED_MORE_FOLLOW_UP">NEED MORE FOLLOW UP</option>

            <option value="TRAINING_ATTENDED">TRAINING ATTENDED</option>

            <option value="SEAT_RESERVED">SEAT RESERVED</option>

            <option value="JOINED">JOINED</option>

            <option value="DEAD">DEAD</option>
          </select>

          <textarea
            name="remarks"
            value={form.remarks}
            onChange={change}
            placeholder="Remarks"
            rows={4}
            className="
            w-full
            rounded-xl
            border
            border-[#D4AF37]/20
            bg-black/30
            p-3
            text-white
            "
          />

          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, isPriority: !prev.isPriority }))}
            className={`
            flex
            w-full
            items-center
            gap-3
            rounded-xl
            border
            p-3
            text-sm
            font-medium
            transition
            ${form.isPriority
              ? "border-red-500/40 bg-red-500/10 text-red-400"
              : "border-[#D4AF37]/20 bg-black/30 text-zinc-400 hover:border-[#D4AF37]/40"
            }
            `}
          >
            <span
              className={`
              flex
              h-5
              w-5
              items-center
              justify-center
              rounded
              border
              text-xs
              ${form.isPriority
                ? "border-red-500 bg-red-500 text-white"
                : "border-zinc-600 bg-transparent"
              }
              `}
            >
              {form.isPriority && "✓"}
            </span>
            Mark as Priority
          </button>

          <Button
            onClick={updateLead}
            disabled={loading}
            className="
            w-full
            rounded-xl
            bg-[#D4AF37]
            text-black
            hover:bg-[#D4AF37]/80
            "
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
