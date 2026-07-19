"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function GroupChatSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const json = await res.json();
        if (json.data) setEnabled(json.data.groupChatEnabled || false);
      } catch {}
    }
    load();
  }, []);

  async function toggle(newValue: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupChatEnabled: newValue }),
      });
      const json = await res.json();
      if (json.success) {
        setEnabled(newValue);
        toast.success(`Group chat ${newValue ? "enabled" : "disabled"}`);
      } else toast.error(json.message);
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-6">
      <h3 className="text-lg font-semibold text-[#D4AF37] mb-2">Group Chat</h3>
      <p className="text-sm text-gray-400 mb-5">
        Enable group chat so all salespersons and admins can communicate in a shared channel.
        When disabled, only 1-on-1 messaging is available.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => toggle(!enabled)}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-emerald-500" : "bg-white/20"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
        <span className={`text-sm font-medium ${enabled ? "text-emerald-400" : "text-gray-400"}`}>
          {enabled ? "Group Chat Enabled" : "Group Chat Disabled"}
        </span>
      </div>
    </div>
  );
}
