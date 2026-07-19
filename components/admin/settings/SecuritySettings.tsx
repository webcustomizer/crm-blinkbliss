"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SecuritySettings() {
  const [settings, setSettings] = useState({
    passwordMinLength: 8,
    passwordRequireSpecial: false,
    twoFactorRequired: false,
    forgotPasswordEnabled: true,
    sessionMaxHours: 168,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const json = await res.json();
        if (json.data) {
          setSettings({
            passwordMinLength: json.data.passwordMinLength || 8,
            passwordRequireSpecial: json.data.passwordRequireSpecial || false,
            twoFactorRequired: json.data.twoFactorRequired || false,
            forgotPasswordEnabled: json.data.forgotPasswordEnabled !== false,
            sessionMaxHours: json.data.sessionMaxHours || 168,
          });
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) toast.success("Security settings updated");
      else toast.error(json.message);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <div className="text-center text-gray-400 py-8">Loading...</div>;

  function Toggle({
    label,
    desc,
    value,
    onChange,
  }: {
    label: string;
    desc?: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) {
    return (
      <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
        <div>
          <p className="text-sm text-gray-200">{label}</p>
          {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
        </div>
        <button
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            value ? "bg-emerald-500" : "bg-white/20"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-[#D4AF37] mb-1">
        Security & Access
      </h3>
      <p className="text-sm text-gray-400 mb-5">
        Configure password policies, authentication, and session settings.
      </p>

      <div className="space-y-1 mb-6">
        <Toggle
          label="Require Two-Factor Authentication"
          desc="Users must verify with email OTP code on login"
          value={settings.twoFactorRequired}
          onChange={(v) => setSettings((s) => ({ ...s, twoFactorRequired: v }))}
        />
        <Toggle
          label="Enable Forgot Password"
          desc="Allow users to reset password via email link"
          value={settings.forgotPasswordEnabled}
          onChange={(v) =>
            setSettings((s) => ({ ...s, forgotPasswordEnabled: v }))
          }
        />
        <Toggle
          label="Require Strong Password"
          desc="Passwords must contain Upper_case Lower_case Numbers & Special _characters !@#$% etc."
          value={settings.passwordRequireSpecial}
          onChange={(v) =>
            setSettings((s) => ({ ...s, passwordRequireSpecial: v }))
          }
        />
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm text-gray-300 mb-2 block">
            Minimum Password Length:{" "}
            <span className="text-[#D4AF37] font-semibold">
              {settings.passwordMinLength}
            </span>
          </label>
          <input
            type="number"
            value={settings.passwordMinLength}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                passwordMinLength: Math.max(
                  6,
                  Math.min(32, Number(e.target.value)),
                ),
              }))
            }
            className="w-20 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
          />
        </div>
        <div>
          <label className="text-sm text-gray-300 mb-2 block">
            Session Timeout:{" "}
            <span className="text-[#D4AF37] font-semibold">
              {settings.sessionMaxHours}h
            </span>{" "}
            ({Math.round(settings.sessionMaxHours / 24)} days)
          </label>
          <input
            type="range"
            min={1}
            max={720}
            value={settings.sessionMaxHours}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                sessionMaxHours: Number(e.target.value),
              }))
            }
            className="w-full accent-[#D4AF37]"
          />
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>1h</span>
            <span>30d</span>
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50 transition"
      >
        {saving ? "Saving..." : "Save Security Settings"}
      </button>
    </div>
  );
}
