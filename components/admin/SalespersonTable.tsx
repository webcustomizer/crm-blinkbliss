"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Edit, Target, KeyRound, UserX, UserCheck } from "lucide-react";
import EditSalespersonDialog from "./EditSalespersonDialog";
import ResetSalespersonPasswordDialog from "./ResetSalespersonPasswordDialog";
import AddSalespersonDialog from "./AddSalespersonDialog";
import type { UserWithTarget } from "@/types/lead";

export default function SalespersonTable() {
  const [data, setData] = useState<UserWithTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserWithTarget | null>(null);
  const [resetPasswordUser, setResetPasswordUser] =
    useState<UserWithTarget | null>(null);
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState("");

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  async function fetchData() {
    try {
      const res = await fetch(`/api/admin/targets?month=${month}&year=${year}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.error("Failed to load sales team.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function updateTarget(userId: string) {
    const target = Number(targetValue);
    if (isNaN(target) || target < 1) {
      toast.error("Please enter a valid target.");
      return;
    }
    try {
      const res = await fetch("/api/admin/targets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, month, year, target }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Target updated.");
        setEditingTarget(null);
        fetchData();
      } else toast.error(json.message);
    } catch {
      toast.error("Failed to update target.");
    }
  }

  async function toggleActive(
    userId: string,
    currentActive: boolean,
    name: string,
  ) {
    try {
      const r = await fetch(`/api/admin/salespersons/${userId}/toggle-active`, {
        method: "POST",
      });
      const j = await r.json();
      if (j.success) {
        toast.success(`${name} ${j.isActive ? "activated" : "deactivated"}`);
        fetchData();
      } else toast.error(j.message || "Failed.");
    } catch {
      toast.error("Failed to toggle status.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">
          Sales Team & Targets
        </h2>
        <AddSalespersonDialog onSuccess={fetchData} />
      </div>

      {/* Mobile card view */}
      <div className="block sm:hidden divide-y divide-white/10">
        {data.map((sp) => {
          const target = sp.currentMonthTarget || sp.monthlyTarget || 50;
          const achieved = sp.currentMonthAchieved || 0;
          const pct =
            target > 0
              ? Math.min(100, Math.round((achieved / target) * 100))
              : 0;

          return (
            <div key={sp.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{sp.name}</p>
                  <p className="text-xs text-white/40">{sp.email}</p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                    sp.isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
                >
                  {sp.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-white/40 mb-1">
                    Target: {target} / Achieved: {achieved}
                  </p>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 80
                          ? "bg-emerald-500"
                          : pct >= 50
                          ? "bg-[#D4AF37]"
                          : pct >= 25
                          ? "bg-orange-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-white/40">{pct}%</span>
              </div>

              <div className="flex items-center gap-2">
                {editingTarget === sp.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="w-14 rounded-lg border border-[#D4AF37]/30 bg-black/30 px-2 py-1 text-xs text-white outline-none"
                      min="1"
                      autoFocus
                    />
                    <button
                      onClick={() => updateTarget(sp.id)}
                      className="text-emerald-400 text-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingTarget(null)}
                      className="text-red-400 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingTarget(sp.id);
                      setTargetValue(String(target));
                    }}
                    className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-[#D4AF37] hover:border-[#D4AF37]/40"
                  >
                    <Target size={12} className="inline mr-1" /> Edit Target
                  </button>
                )}
                <button
                  onClick={() => setEditUser(sp)}
                  className="rounded-lg border border-white/10 bg-black/30 p-1.5 text-white/60 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => setResetPasswordUser(sp)}
                  className="rounded-lg border border-white/10 bg-black/30 p-1.5 text-white/60 hover:border-orange-500/40 hover:text-orange-400"
                >
                  <KeyRound size={14} />
                </button>
                <button
                  onClick={() => toggleActive(sp.id, sp.isActive, sp.name)}
                  className={`rounded-lg border bg-black/30 p-1.5 transition-colors ${
                    sp.isActive
                      ? "border-white/10 text-red-400 hover:border-red-500/40"
                      : "border-white/10 text-emerald-400 hover:border-emerald-500/40"
                  }`}
                  title={sp.isActive ? "Deactivate" : "Activate"}
                >
                  {sp.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                </button>
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <div className="p-8 text-center text-white/40">
            No sales team members found.
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-black/20">
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                Name
              </th>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                Email
              </th>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                Status
              </th>
              <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                Monthly Target
              </th>
              <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                Achieved
              </th>
              <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                Progress
              </th>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-[#D4AF37]/70">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((sp) => {
              const target = sp.currentMonthTarget || sp.monthlyTarget || 50;
              const achieved = sp.currentMonthAchieved || 0;
              const pct =
                target > 0
                  ? Math.min(100, Math.round((achieved / target) * 100))
                  : 0;

              return (
                <tr
                  key={sp.id}
                  className="border-b border-white/5 text-white/70 hover:bg-[#D4AF37]/[0.04] transition-colors"
                >
                  <td className="p-4 font-medium text-white">{sp.name}</td>
                  <td className="p-4 text-white/50">{sp.email}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                        sp.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {sp.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {editingTarget === sp.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          className="w-16 rounded-lg border border-[#D4AF37]/30 bg-black/30 px-2 py-1 text-center text-xs text-white outline-none"
                          min="1"
                          autoFocus
                        />
                        <button
                          onClick={() => updateTarget(sp.id)}
                          className="text-emerald-400 text-xs hover:text-emerald-300"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTarget(null)}
                          className="text-red-400 text-xs hover:text-red-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingTarget(sp.id);
                          setTargetValue(String(target));
                        }}
                        className="flex items-center gap-1 mx-auto text-[#D4AF37] hover:text-[#e6c04a] transition-colors"
                      >
                        <Target size={14} />
                        <span className="font-medium">{target}</span>
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-medium text-white">{achieved}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 80
                              ? "bg-emerald-500"
                              : pct >= 50
                              ? "bg-[#D4AF37]"
                              : pct >= 25
                              ? "bg-orange-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/40 w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditUser(sp)}
                        className="rounded-lg border border-white/10 bg-black/30 p-2 text-white/60 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setResetPasswordUser(sp)}
                        className="rounded-lg border border-white/10 bg-black/30 p-2 text-white/60 hover:border-orange-500/40 hover:text-orange-400 transition-colors"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        onClick={() =>
                          toggleActive(sp.id, sp.isActive, sp.name)
                        }
                        className={`rounded-lg border bg-black/30 p-2 transition-colors ${
                          sp.isActive
                            ? "border-white/10 text-red-400 hover:border-red-500/40 hover:text-red-300"
                            : "border-white/10 text-emerald-400 hover:border-emerald-500/40 hover:text-emerald-300"
                        }`}
                        title={
                          sp.isActive
                            ? "Deactivate salesperson"
                            : "Activate salesperson"
                        }
                      >
                        {sp.isActive ? (
                          <UserX size={14} />
                        ) : (
                          <UserCheck size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-white/40">
                  No sales team members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editUser && (
        <EditSalespersonDialog
          user={editUser}
          onSuccess={fetchData}
          open={!!editUser}
          setOpen={() => setEditUser(null)}
        />
      )}
      {resetPasswordUser && (
        <ResetSalespersonPasswordDialog
          user={resetPasswordUser}
          open={!!resetPasswordUser}
          setOpen={() => setResetPasswordUser(null)}
        />
      )}
    </div>
  );
}
