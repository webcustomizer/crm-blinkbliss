"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { handleAPIError } from "@/lib/client-error";

export default function CommunicationSettings() {
  const [gcEnabled, setGcEnabled] = useState(true);
  const [msgEnabled, setMsgEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const json = await res.json();
        if (json.data) {
          setGcEnabled(json.data.groupChatEnabled !== false);
          setMsgEnabled(json.data.messageEnabled !== false);
        }
      } catch (e) { handleAPIError(e, "Failed to load communication settings"); }
    }
    load();
  }, []);

  async function toggleGC() {
    const newVal = !gcEnabled;
    setGcEnabled(newVal);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupChatEnabled: newVal }),
      });
      const json = await res.json();
      if (json.success) toast.success(`Group Chat ${newVal ? "enabled" : "disabled"}`);
      else { toast.error(json.message || "Failed"); setGcEnabled(!newVal); }
    } catch { toast.error("Failed"); setGcEnabled(!newVal); }
    finally { setLoading(false); }
  }

  async function toggleMsg() {
    const newVal = !msgEnabled;
    setMsgEnabled(newVal);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageEnabled: newVal }),
      });
      const json = await res.json();
      if (json.success) toast.success(`1-on-1 Messages ${newVal ? "enabled" : "disabled"}`);
      else { toast.error(json.message || "Failed"); setMsgEnabled(!newVal); }
    } catch { toast.error("Failed"); setMsgEnabled(!newVal); }
    finally { setLoading(false); }
  }

  function Toggle({ label, desc, value, onToggle }: { label: string; desc?: string; value: boolean; onToggle: () => void }) {
    return (
      <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
        <div>
          <p className="text-sm text-gray-200">{label}</p>
          {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
        </div>
        <button onClick={onToggle} disabled={loading}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${value ? "bg-emerald-500" : "bg-white/20"}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-[#D4AF37] mb-1">Communication</h3>
      <p className="text-sm text-gray-400 mb-4 sm:mb-5">Enable or disable messaging features for salespersons.</p>
      <div className="space-y-1">
        <Toggle label="Group Chat" desc="Team-wide chat for all members" value={gcEnabled} onToggle={toggleGC} />
        <Toggle label="1-on-1 Messages" desc="Private messages between salesperson and admin" value={msgEnabled} onToggle={toggleMsg} />
      </div>
    </div>
  );
}
