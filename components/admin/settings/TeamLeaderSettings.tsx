"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function TeamLeaderSettings() {
  const [settings, setSettings] = useState({
    tlMessageEnabled: true,
    tlGroupChatEnabled: true,
    tlTeamLeadsEnabled: true,
    tlDistributeEnabled: true,
    tlMaxTeamSize: 10,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setSettings({
            tlMessageEnabled: json.data.tlMessageEnabled ?? true,
            tlGroupChatEnabled: json.data.tlGroupChatEnabled ?? true,
            tlTeamLeadsEnabled: json.data.tlTeamLeadsEnabled ?? true,
            tlDistributeEnabled: json.data.tlDistributeEnabled ?? true,
            tlMaxTeamSize: json.data.tlMaxTeamSize ?? 10,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const j = await r.json();
    if (j.success) toast.success("Settings saved.");
    else toast.error(j.message);
  }

  function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
      <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
        <div>
          <p className="text-sm text-gray-200">{label}</p>
          {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
        </div>
        <button onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${value ? "bg-emerald-500" : "bg-white/20"}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
    );
  }

  if (loading) return <div className="text-zinc-400">Loading...</div>;

  return (
    <div className="rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
      <h2 className="mb-1 text-lg font-semibold text-white">Team Leader Settings</h2>
      <p className="mb-6 text-sm text-zinc-400">Configure Team Leader permissions and limits</p>

      <div className="space-y-1">
        <Toggle label="1-to-1 Messages" desc="Allow Team Leaders to send direct messages" value={settings.tlMessageEnabled} onChange={(v) => setSettings((s) => ({ ...s, tlMessageEnabled: v }))} />
        <Toggle label="Group Chat" desc="Allow Team Leaders to access their team group chat" value={settings.tlGroupChatEnabled} onChange={(v) => setSettings((s) => ({ ...s, tlGroupChatEnabled: v }))} />
        <Toggle label="Team Leads View" desc="Allow Team Leaders to view their team's leads" value={settings.tlTeamLeadsEnabled} onChange={(v) => setSettings((s) => ({ ...s, tlTeamLeadsEnabled: v }))} />
        <Toggle label="Lead Distribution" desc="Allow Team Leaders to distribute leads to team members" value={settings.tlDistributeEnabled} onChange={(v) => setSettings((s) => ({ ...s, tlDistributeEnabled: v }))} />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white">Max Team Size</p>
          <p className="text-xs text-zinc-400">Maximum members per team</p>
        </div>
        <input type="number" value={settings.tlMaxTeamSize}
          onChange={(e) => setSettings((s) => ({ ...s, tlMaxTeamSize: Math.max(1, Number(e.target.value)) }))}
          className="w-16 rounded-lg border border-[#D4AF37]/30 bg-black/60 px-2 py-1 text-center text-sm text-white outline-none" min={1} max={100}
        />
      </div>

      <button onClick={save}
        className="mt-6 rounded-xl bg-[#D4AF37] px-6 py-2.5 text-sm font-semibold text-black transition-all hover:bg-[#e6c04a] active:scale-[0.97]"
      >
        Save Settings
      </button>
    </div>
  );
}