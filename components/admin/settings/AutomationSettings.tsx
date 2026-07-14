"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Zap, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AutomationSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/automation")
      .then((res) => res.json())
      .then((data) => setEnabled(Boolean(data?.autoAssignEnabled)))
      .catch((err) => console.error("Failed to load automation setting:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    const newValue = !enabled;

    setUpdating(true);
    setEnabled(newValue);

    try {
      const res = await fetch("/api/admin/settings/automation", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: newValue,
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success(newValue ? "Auto-assign Enabled" : "Auto-assign Disabled", {
        description: newValue
          ? "New imported leads will be assigned automatically."
          : "New imported leads will remain unassigned.",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      });
    } catch (err) {
      console.error(err);

      setEnabled(!newValue);

      toast.error("Update failed", {
        description: "Please try again.",
        icon: <XCircle className="h-4 w-4 text-red-500" />,
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className="
        rounded-2xl
        border
        border-white/10
        bg-transparent
        p-6
      "
    >
      <div className="flex items-center justify-between gap-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-xl
              border
              border-emerald-500/20
              bg-emerald-500/10
            "
          >
            <Zap className="h-6 w-6 text-emerald-400" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              Auto Lead Assignment
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Automatically distribute imported leads among active salespersons.
            </p>
          </div>
        </div>

        {/* Toggle */}
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <button
            onClick={handleToggle}
            disabled={updating}
            role="switch"
            aria-checked={enabled}
            className={`
              relative
              h-8
              w-14
              rounded-full
              transition-all
              duration-300
              disabled:cursor-not-allowed
              disabled:opacity-50
              ${enabled ? "bg-emerald-500" : "bg-red-500"}
            `}
          >
            <span
              className={`
                absolute
                top-1
                left-1
                h-6
                w-6
                rounded-full
                bg-white
                shadow-md
                transition-transform
                duration-300
                ${enabled ? "translate-x-6" : "translate-x-0"}
              `}
            />
          </button>
        )}
      </div>

      {/* Status */}
      <div
        className={`
          mt-6
          rounded-xl
          border
          px-4
          py-4
          ${
            enabled
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-white/10 bg-red-500/5"
          }
        `}
      >
        {enabled ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />

            <div>
              <p className="font-semibold text-emerald-400">
                Automation Enabled
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-300">
                Imported CSV leads will be assigned automatically using the
                round-robin method among active salespersons.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 text-red-400" />

            <div>
              <p className="font-semibold text-gray-300">Automation Disabled</p>

              <p className="mt-1 text-sm leading-6 text-gray-400">
                Imported leads will remain unassigned until an admin assigns
                them manually.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
