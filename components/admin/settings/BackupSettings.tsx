"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { handleAPIError } from "@/lib/client-error";
import { Download, Database } from "lucide-react";

export default function BackupSettings() {
  const [autoBackup, setAutoBackup] = useState(false);
  const [frequencyDays, setFrequencyDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const json = await res.json();
        if (json.data) {
          setAutoBackup(json.data.autoBackupEnabled || false);
          setFrequencyDays(json.data.backupFrequencyDays || 7);
        }
      } catch (e) { handleAPIError(e, "Failed to load backup settings"); }
    }
    load();
  }, []);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoBackupEnabled: autoBackup, backupFrequencyDays: frequencyDays }),
      });
      const json = await res.json();
      if (json.success) toast.success("Backup settings updated");
      else toast.error(json.message);
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function exportAllData() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export-leads?type=all");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blinknbliss-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup exported successfully");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-6">
      <h3 className="text-lg font-semibold text-[#D4AF37] mb-2">Data Backup</h3>
      <p className="text-sm text-gray-400 mb-5">
        Configure automatic backups and manually export your data.
      </p>

      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoBackup(!autoBackup)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoBackup ? "bg-emerald-500" : "bg-white/20"
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              autoBackup ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
          <span className="text-sm text-gray-300">Enable Automatic Backups</span>
        </div>

        {autoBackup && (
          <div>
            <label className="text-sm text-gray-300 mb-2 block">Backup frequency (days)</label>
            <input
              type="number"
              value={frequencyDays}
              onChange={(e) => setFrequencyDays(Number(e.target.value))}
              min={1} max={30}
              className="w-24 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={loading}
            className="rounded-lg bg-[#D4AF37] px-5 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Settings"}
          </button>
          <button
            onClick={exportAllData}
            disabled={exporting}
            className="rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-2 text-sm font-medium text-[#D4AF37] hover:bg-[#D4AF37]/20 disabled:opacity-50 flex items-center gap-2"
          >
            <Download size={14} />
            {exporting ? "Exporting..." : "Export All Data Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
