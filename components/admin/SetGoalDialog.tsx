"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
  currentTarget: number;
  currentMonths: number;
  onSuccess: () => void;
}

export default function SetGoalDialog({ userId, currentTarget, currentMonths, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [monthlyTarget, setMonthlyTarget] = useState(String(currentTarget));
  const [targetMonths, setTargetMonths] = useState(String(currentMonths));
  const [loading, setLoading] = useState(false);

  const targetNum = Number(monthlyTarget);
  const monthsNum = Number(targetMonths);
  const totalGoal = targetNum * monthsNum;
  const valid = targetNum >= 1 && monthsNum >= 1;

  async function save() {
    if (!valid) { toast.error("Target and months must be at least 1."); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/users/set-goal/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyTarget: targetNum, targetMonths: monthsNum }),
      });
      const j = await r.json();
      if (j.success) { toast.success("Goal set successfully."); setOpen(false); onSuccess(); }
      else toast.error(j.message);
    } catch { toast.error("Failed."); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="rounded-lg border border-white/10 bg-black/30 p-1.5 text-white/40 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all" title="Set Goal">
            <Target size={13} />
          </button>
        }
      />
      <DialogContent className="bg-[#181818] text-white border-yellow-600/30 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#D4AF37] text-lg flex items-center gap-2">
            <Target size={18} /> Set Performance Goal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Target (per month)</label>
            <input type="number" value={monthlyTarget} onChange={(e) => setMonthlyTarget(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/30 mt-1" min="1"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Evaluation Period</label>
            <input type="number" value={targetMonths} onChange={(e) => setTargetMonths(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/30 mt-1" min="1"
            />
          </div>
          {valid && (
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-center">
              <p className="text-[11px] text-white/40">Total Goal</p>
              <p className="text-lg font-bold text-[#D4AF37]">{totalGoal} joined leads</p>
            </div>
          )}
          <Button onClick={save} disabled={loading || !valid} className="w-full bg-[#D4AF37] text-black hover:bg-[#c79f27]">
            {loading ? "Saving..." : "Save Goal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
