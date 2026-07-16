"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Users,
  Calendar,
  MapPin,
  Loader2,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  Sparkles,
  UserCircle2,
  XCircle,
} from "lucide-react";

type Salesperson = { id: string; name: string };

const STATUS_OPTIONS = [
  "NEW",
  "CALLED",
  "NEED_MORE_FOLLOW_UP",
  "TRAINING_ATTENDED",
  "SEAT_RESERVED",
  "JOINED",
  "DEAD",
];

const EXPORT_TYPES = [
  { value: "all", label: "All Leads", icon: FileSpreadsheet },
  { value: "today", label: "Today's Leads", icon: Calendar },
  { value: "month", label: "This Month", icon: Calendar },
  { value: "status", label: "Export by Status", icon: CheckCircle2 },
  { value: "city", label: "Export by City", icon: MapPin },
  { value: "salesperson", label: "Export by Salesperson", icon: Users },
  { value: "dateRange", label: "Export by Date Range", icon: Calendar },
];

type LastExport = {
  type: string;
  label: string;
  recordCount: number;
  createdAt: string;
  exportedBy?: { name: string } | null;
};

export default function ExportLeadsSection() {
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [lastExport, setLastExport] = useState<LastExport | null>(null);
  const [lastExportLoading, setLastExportLoading] = useState(true);

  const fetchLastExport = () => {
    setLastExportLoading(true);
    fetch("/api/admin/export-leads/last")
      .then((res) => res.json())
      .then((data) => setLastExport(data ?? null))
      .catch((err) => console.error("Failed to load last export:", err))
      .finally(() => setLastExportLoading(false));
  };

  useEffect(() => {
    fetch("/api/admin/salespeople")
      .then((res) => res.json())
      .then((data) => setSalespeople(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load salespeople:", err));

    fetchLastExport();
  }, []);

  const isDisabled =
    loading ||
    (type === "status" && !status) ||
    (type === "city" && !city) ||
    (type === "salesperson" && !salespersonId) ||
    (type === "dateRange" && (!dateFrom || !dateTo));

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (type === "status") params.set("status", status);
      if (type === "city") params.set("city", city);
      if (type === "salesperson") params.set("salespersonId", salespersonId);
      if (type === "dateRange") {
        params.set("dateFrom", dateFrom);
        params.set("dateTo", dateTo);
      }

      const res = await fetch(`/api/admin/export-leads?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      const selectedLabel =
        EXPORT_TYPES.find((t) => t.value === type)?.label ?? "Leads";

      toast.success("Export successful", {
        description: `${selectedLabel} CSV download successfully`,
        icon: <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />,
      });

      fetchLastExport();
    } catch (err) {
      console.error(err);
      toast.error("Export failed try again", {
        description: "Dobara try karein ya thodi der baad try karein.",
        icon: <XCircle className="h-4 w-4 text-red-400" />,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-b from-[#1A1A1A] via-[#171717] to-[#121212] p-6 shadow-xl shadow-black/50 transition-all hover:border-[#D4AF37]/30">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl transition-opacity group-hover:opacity-80" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-[#D4AF37]/5 blur-3xl" />
      {/* Top hairline gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/15 to-[#D4AF37]/5 text-[#D4AF37]">
            <Download className="h-5 w-5" />
            <Sparkles className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-[#D4AF37]/70" />
          </div>
          <div>
            <h2 className="bg-gradient-to-r from-[#D4AF37] to-[#f0d878] bg-clip-text text-lg font-semibold text-transparent">
              Export CSV
            </h2>
            <p className="text-sm text-gray-400">
              Leads data ko CSV format mein export karein
            </p>
          </div>
        </div>
      </div>

      {/* Last export card */}
      <div className="relative mt-5">
        {lastExportLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/30 px-4 py-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D4AF37]/60" />
            <span className="text-xs text-gray-500">
              Loading last export...
            </span>
          </div>
        ) : lastExport ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#D4AF37]/10 bg-gradient-to-r from-black/40 to-black/20 px-4 py-3">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span className="text-gray-400">Last export:</span>
              <span className="font-medium text-gray-100">
                {lastExport.label}
              </span>
            </div>

            <div className="h-3 w-px bg-white/10" />

            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#D4AF37]/70" />
              <span className="font-medium text-gray-200">
                {lastExport.recordCount}
              </span>
              <span>records</span>
            </div>

            {lastExport.exportedBy?.name && (
              <>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <UserCircle2 className="h-3.5 w-3.5 text-[#D4AF37]/70" />
                  <span className="text-gray-200">
                    {lastExport.exportedBy.name}
                  </span>
                </div>
              </>
            )}

            <div className="h-3 w-px bg-white/10" />

            <span className="text-xs text-gray-500">
              {formatTimestamp(lastExport.createdAt)}
            </span>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-xs text-gray-500">
            No export done yet
          </div>
        )}
      </div>

      {/* Export type selector */}
      <div className="relative mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {EXPORT_TYPES.map((opt) => {
          const Icon = opt.icon;
          const isActive = type === opt.value;
          return (
            <label
              key={opt.value}
              className={`relative flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl border px-3.5 py-3 text-sm transition-all duration-200 ${
                isActive
                  ? "border-[#D4AF37]/50 bg-gradient-to-r from-[#D4AF37]/15 to-[#D4AF37]/5 text-[#D4AF37] shadow-inner shadow-[#D4AF37]/5"
                  : "border-white/5 bg-black/20 text-gray-300 hover:border-[#D4AF37]/25 hover:bg-black/30"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-0 h-full w-0.5 bg-[#D4AF37]" />
              )}
              <input
                type="radio"
                name="exportType"
                value={opt.value}
                checked={isActive}
                onChange={() => setType(opt.value)}
                className="hidden"
              />
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-[#D4AF37]" : "text-gray-500"
                }`}
              />
              <span className="truncate">{opt.label}</span>
            </label>
          );
        })}
      </div>

      {/* Conditional fields */}
      {type === "status" && (
        <select
          className="relative mt-4 w-full rounded-xl border border-[#D4AF37]/20 bg-[#111111] p-2.5 text-sm text-gray-200 transition-colors focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Select Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      )}

      {type === "city" && (
        <input
          type="text"
          placeholder="City ka naam likhein"
          className="relative mt-4 w-full rounded-xl border border-[#D4AF37]/20 bg-[#111111] p-2.5 text-sm text-gray-200 placeholder-gray-500 transition-colors focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      )}

      {type === "salesperson" && (
        <select
          className="relative mt-4 w-full rounded-xl border border-[#D4AF37]/20 bg-[#111111] p-2.5 text-sm text-gray-200 transition-colors focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
          value={salespersonId}
          onChange={(e) => setSalespersonId(e.target.value)}
        >
          <option value="">Select Salesperson</option>
          {salespeople.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.name}
            </option>
          ))}
        </select>
      )}

      {type === "dateRange" && (
        <div className="relative mt-4 flex gap-3">
          <input
            type="date"
            className="w-full rounded-xl border border-[#D4AF37]/20 bg-[#111111] p-2.5 text-sm text-gray-200 transition-colors focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <input
            type="date"
            className="w-full rounded-xl border border-[#D4AF37]/20 bg-[#111111] p-2.5 text-sm text-gray-200 transition-colors focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={isDisabled}
        className="relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#e8c452] to-[#c4a030] px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-[#D4AF37]/20 transition-all hover:shadow-xl hover:shadow-[#D4AF37]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 sm:w-auto sm:px-6"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Export CSV
          </>
        )}
      </button>
    </div>
  );
}
