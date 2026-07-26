"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Zap, Loader2, CheckCircle2, XCircle, Users, User,
  Settings, ChevronDown, Save, RotateCcw, ArrowRight,
} from "lucide-react";

type Candidate = {
  id: string;
  name: string;
  role: "SALESPERSON" | "TEAM_LEAD";
  teamSize: number;
  weight: number;
};

type Mode = "DISABLED" | "TL_WEIGHTED" | "TL_TEAM_AUTO" | "DIRECT_WEIGHTED";

const MODES: { value: Mode; label: string; desc: string }[] = [
  { value: "DISABLED", label: "Disabled", desc: "No automatic assignment — all leads stay unassigned." },
  { value: "TL_WEIGHTED", label: "Team Leaders (Weighted)", desc: "Assigns to TLs based on weight. TL manually distributes to team." },
  { value: "TL_TEAM_AUTO", label: "Team Leaders → Auto Team", desc: "Assigns to TL (weighted), then auto-distributes within their team." },
  { value: "DIRECT_WEIGHTED", label: "Everyone Direct (Weighted)", desc: "Assigns directly to any eligible person based on weight." },
];

export default function AutomationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("DISABLED");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [editedWeights, setEditedWeights] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/automation", { cache: "no-store" });
      const data = await res.json();
      setMode(data.automationMode || "DISABLED");
      setCandidates(data.candidates || []);
      const w: Record<string, number> = {};
      (data.candidates || []).forEach((c: Candidate) => {
        w[c.id] = c.weight;
      });
      setEditedWeights(w);
      setHasChanges(false);
    } catch (err) {
      console.error("Failed to load automation settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setHasChanges(true);
  };

  const handleWeightChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    const safe = isNaN(num) ? 1 : Math.max(1, Math.min(100, num));
    setEditedWeights((prev) => ({ ...prev, [id]: safe }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          weights: editedWeights,
        }),
      });
      if (!res.ok) throw new Error("Update failed");

      setHasChanges(false);

      const modeLabel = MODES.find((m) => m.value === mode)?.label || mode;
      toast.success("Automation Updated", {
        description: mode === "DISABLED" ? "Auto-assign is now disabled." : `Mode: ${modeLabel}`,
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      });
    } catch (err) {
      console.error(err);
      toast.error("Update failed", { description: "Please try again.", icon: <XCircle className="h-4 w-4 text-red-500" /> });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchData();
  };

  const activeCandidates = mode === "DIRECT_WEIGHTED"
    ? candidates
    : candidates.filter((c) => c.role === "TEAM_LEAD");

  const soloSPs = candidates.filter((c) => c.role === "SALESPERSON" && !c.teamSize);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-transparent p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
            <Zap className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-zinc-800" />
            <div className="h-3 w-64 rounded bg-zinc-800" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-zinc-800/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section 1: Mode Selection */}
      <div className="rounded-2xl border border-white/10 bg-transparent p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
            <Zap className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Auto Lead Assignment</h2>
            <p className="mt-1 text-sm text-gray-400">Choose how new leads are automatically distributed.</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => handleModeChange(m.value)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                mode === m.value
                  ? "border-[#D4AF37]/40 bg-[#D4AF37]/10 text-white"
                  : "border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  mode === m.value ? "border-[#D4AF37] bg-[#D4AF37]" : "border-zinc-600"
                }`}>
                  {mode === m.value && <div className="h-2 w-2 rounded-full bg-black" />}
                </div>
                <div>
                  <p className="text-sm font-semibold">{m.label}</p>
                  <p className="text-xs text-zinc-400">{m.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Weights Table (only when mode is not DISABLED) */}
      {mode !== "DISABLED" && (
        <div className="rounded-2xl border border-white/10 bg-transparent p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10">
                <Settings className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Assignment Weights</h3>
                <p className="text-xs text-zinc-400">
                  {mode.includes("TL")
                    ? "Higher weight = more leads assigned to that Team Leader"
                    : "Higher weight = more leads assigned to that person"}
                </p>
              </div>
            </div>
          </div>

          {/* Candidates Table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Role</th>
                  {mode !== "DIRECT_WEIGHTED" && <th className="pb-3 pr-4">Team Size</th>}
                  <th className="pb-3 text-right">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeCandidates.map((c) => (
                  <tr key={c.id} className="group">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                          c.role === "TEAM_LEAD"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                            : "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/20"
                        }`}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        c.role === "TEAM_LEAD"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                      }`}>
                        {c.role === "TEAM_LEAD" ? <Users size={9} /> : <User size={9} />}
                        {c.role === "TEAM_LEAD" ? "Team Lead" : "Salesperson"}
                      </span>
                    </td>
                    {mode !== "DIRECT_WEIGHTED" && (
                      <td className="py-3 pr-4 text-zinc-400">
                        {c.role === "TEAM_LEAD" ? (
                          <span>{c.teamSize} member{c.teamSize !== 1 ? "s" : ""}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 text-right">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={editedWeights[c.id] ?? c.weight}
                        onChange={(e) => handleWeightChange(c.id, e.target.value)}
                        className="w-16 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-right text-sm text-white outline-none transition focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/25"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {activeCandidates.length === 0 && (
              <div className="py-8 text-center text-sm text-zinc-500">
                {mode.includes("TL")
                  ? "No Team Leaders found. Create Team Leaders first."
                  : "No eligible users found."}
              </div>
            )}
          </div>

          {/* Solo SPs note when in TL mode */}
          {mode.includes("TL") && soloSPs.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">{soloSPs.length} salesperson(s)</span> without a team — they are not included in TL-based assignment. Switch to &quot;Everyone Direct&quot; mode to include them.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Save / Reset Buttons (always visible when there are changes) */}
      {hasChanges && (
        <div className="rounded-2xl border border-white/10 bg-transparent p-4 flex items-center justify-end gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-black transition-all hover:bg-[#c9a430]"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Status Summary */}
      <div className={`rounded-2xl border px-5 py-4 ${
        mode !== "DISABLED" ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-red-500/5"
      }`}>
        {mode !== "DISABLED" ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-400">Automation Active</p>
              <p className="mt-1 text-sm leading-6 text-gray-300">
                Mode: {MODES.find((m) => m.value === mode)?.label}. Leads will be auto-assigned
                {mode === "TL_WEIGHTED" && " to Team Leaders (who distribute manually)."}
                {mode === "TL_TEAM_AUTO" && " to Team Leaders, then auto-distributed within their team."}
                {mode === "DIRECT_WEIGHTED" && " directly to eligible persons based on weight."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 text-red-400" />
            <div>
              <p className="font-semibold text-gray-300">Automation Disabled</p>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                New leads will remain unassigned until an admin assigns them manually.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
