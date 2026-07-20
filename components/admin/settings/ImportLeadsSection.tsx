"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Upload,
  FileUp,
  Loader2,
  Sparkles,
  Download,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Eye,
  EyeOff,
} from "lucide-react";

const TEMPLATE_HEADERS = [
  "Name",
  "Phone",
  "Email",
  "City",
  "Age",
  "Purpose",
  "Current Status",
  "Best Time To Reach",
  "Willing To Attend Training",
  "Source",
];

const PREVIEW_LIMIT = 10;

// Rows are sent to the server in batches of this size, instead of all
// at once. This avoids request-timeout / payload-size issues on large
// CSV files (e.g. 5000+ rows) and lets us show real import progress.
const CHUNK_SIZE = 300;

type ImportSummary = {
  totalRows: number;
  inserted: number;
  skippedDuplicate: number;
  skippedInvalid: number;
  autoAssigned: number;
};

const EMPTY_SUMMARY: ImportSummary = {
  totalRows: 0,
  inserted: 0,
  skippedDuplicate: 0,
  skippedInvalid: 0,
  autoAssigned: 0,
};

function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

export default function ImportLeadsSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number>(0);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSummary, setLastSummary] = useState<ImportSummary | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Progress tracking for chunked import
  const [progressPercent, setProgressPercent] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);

  const resetSelection = () => {
    setFileName(null);
    setRowCount(0);
    setParsedRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetProgress = () => {
    setProgressPercent(0);
    setProcessedRows(0);
    setTotalChunks(0);
    setCurrentChunk(0);
  };

  // Normalizes every parsed row so all values are trimmed strings,
  // regardless of whether they came from CSV (already strings) or
  // XLSX (numbers, dates, booleans etc. from the sheet cells).
  const normalizeRow = (row: Record<string, unknown>) => {
    const clean: Record<string, string> = {};
    for (const key of Object.keys(row)) {
      const value = row[key];
      clean[key.trim()] =
        value === null || value === undefined ? "" : String(value).trim();
    }
    return clean;
  };

  const parseCsvFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map(normalizeRow);
        setFileName(file.name);
        setParsedRows(rows);
        setRowCount(rows.length);
        setShowPreview(true);
      },
      error: (err) => {
        console.error(err);
        toast.error("CSV can't be parsed", {
          description: "First check your File format then re-try.",
          icon: <XCircle className="h-4 w-4 text-red-400" />,
        });
        resetSelection();
      },
    });
  };

  const parseExcelFile = async (file: File) => {
    try {
      // Loaded on demand — xlsx is a large library, no need to ship it
      // to every visitor of this settings page, only to those who
      // actually upload an .xlsx/.xls file.
      const XLSX = await import("xlsx");

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("No sheet found in workbook");
      }

      const sheet = workbook.Sheets[firstSheetName];

      // defval: "" ensures empty cells become "" instead of being
      // omitted from the row object (keeps columns consistent).
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
      });

      const rows = rawRows.map(normalizeRow);

      setFileName(file.name);
      setParsedRows(rows);
      setRowCount(rows.length);
      setShowPreview(true);
    } catch (err) {
      console.error(err);
      toast.error("Excel file not been parsed", {
        description: "File format check then try karein.",
        icon: <XCircle className="h-4 w-4 text-red-400" />,
      });
      resetSelection();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith(".csv");
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");

    if (!isCsv && !isExcel) {
      toast.error("wrong file type", {
        description: "only .csv, .xlsx or .xls file upload could be uploaded.",
        icon: <XCircle className="h-4 w-4 text-red-400" />,
      });
      resetSelection();
      return;
    }

    if (isCsv) {
      parseCsvFile(file);
    } else {
      parseExcelFile(file);
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    const chunks = chunkRows(parsedRows, CHUNK_SIZE);

    setLoading(true);
    resetProgress();
    setTotalChunks(chunks.length);

    const combined: ImportSummary = { ...EMPTY_SUMMARY };

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        const res = await fetch("/api/admin/import-leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunk }),
        });

        if (!res.ok) {
          throw new Error(`Chunk ${i + 1} of ${chunks.length} failed`);
        }

        const summary: ImportSummary = await res.json();

        combined.totalRows += summary.totalRows;
        combined.inserted += summary.inserted;
        combined.skippedDuplicate += summary.skippedDuplicate;
        combined.skippedInvalid += summary.skippedInvalid;
        combined.autoAssigned += summary.autoAssigned;

        const done = i + 1;
        setCurrentChunk(done);
        setProcessedRows((prev) => prev + chunk.length);
        setProgressPercent(Math.round((done / chunks.length) * 100));
      }

      setLastSummary(combined);

      toast.success("Import complete", {
        description: `${combined.inserted} leads added, ${combined.skippedDuplicate} duplicate skipped.${
          combined.autoAssigned > 0
            ? ` ${combined.autoAssigned} leads auto-assigned to salespersons`
            : ""
        }`,
        icon: <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />,
      });

      resetSelection();
    } catch (err) {
      console.error(err);

      // Keep whatever succeeded so far visible to the user, since some
      // chunks may have already been inserted before the failure.
      if (combined.totalRows > 0) {
        setLastSummary(combined);
      }

      toast.error("Import failed try again", {
        description:
          currentChunk > 0
            ? `${processedRows} rows were imported try again.`
            : "try again and make sure your file ",
        icon: <XCircle className="h-4 w-4 text-red-400" />,
      });
    } finally {
      setLoading(false);
      resetProgress();
    }
  };

  const handleDownloadTemplate = () => {
    const csv = TEMPLATE_HEADERS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-import-template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const previewRows = parsedRows.slice(0, PREVIEW_LIMIT);
  const remainingCount = rowCount - previewRows.length;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-b from-[#1A1A1A] via-[#171717] to-[#121212] p-6 shadow-xl shadow-black/50 transition-all hover:border-[#D4AF37]/30">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl transition-opacity group-hover:opacity-80" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/15 to-[#D4AF37]/5 text-[#D4AF37]">
            <Upload className="h-5 w-5" />
            <Sparkles className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-[#D4AF37]/70" />
          </div>
          <div>
            <h2 className="bg-gradient-to-r from-[#D4AF37] to-[#f0d878] bg-clip-text text-lg font-semibold text-transparent">
              Import Leads
            </h2>
            <p className="text-sm text-gray-400">
              CSV or Excel file bulk leads add
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#D4AF37]/20 bg-black/20 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
        >
          <Download className="h-3.5 w-3.5" />
          Template
        </button>
      </div>

      {/* Last import summary */}
      {lastSummary && (
        <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#D4AF37]/10 bg-gradient-to-r from-black/40 to-black/20 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span className="font-medium text-gray-100">
              {lastSummary.inserted}
            </span>
            <span>added</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="font-medium text-gray-200">
              {lastSummary.skippedDuplicate}
            </span>
            <span>duplicate skipped</span>
          </div>
          {lastSummary.skippedInvalid > 0 && (
            <>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="font-medium text-red-400">
                  {lastSummary.skippedInvalid}
                </span>
                <span>invalid (phone missing)</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* File drop / select area */}
      <div className="relative mt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          id="import-csv-input"
        />

        {!fileName ? (
          <label
            htmlFor="import-csv-input"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#D4AF37]/25 bg-black/20 px-4 py-8 text-center transition-colors hover:border-[#D4AF37]/50 hover:bg-black/30"
          >
            <FileUp className="h-6 w-6 text-[#D4AF37]/70" />
            <p className="text-sm text-gray-300">
              CSV or Excel (.xlsx) file clicked to select
            </p>
            <p className="text-xs text-gray-500">
                Columns: Name, Phone, Email, City, Age, Purpose, Current Status,
                Best Time To Reach, Willing To Attend Training, Source
              </p>
          </label>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/20 bg-black/30 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="h-4 w-4 text-[#D4AF37]" />
              <div>
                <p className="text-sm font-medium text-gray-100">{fileName}</p>
                <p className="text-xs text-gray-500">
                  {rowCount} rows detected
                  {rowCount > CHUNK_SIZE &&
                    ` · ${Math.ceil(rowCount / CHUNK_SIZE)} batches (${CHUNK_SIZE}/batch)`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#D4AF37]"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide preview
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Show preview
                  </>
                )}
              </button>

              <button
                onClick={resetSelection}
                disabled={loading}
                className="text-xs text-gray-500 underline decoration-dotted hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {fileName && showPreview && previewRows.length > 0 && (
        <div className="relative mt-4 overflow-hidden rounded-xl border border-[#D4AF37]/15 bg-black/20">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Preview
            </p>
            <p className="text-xs text-gray-500">
              Showing {previewRows.length} of {rowCount} rows
            </p>
          </div>

          {/* Mobile: card list */}
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto p-3 sm:hidden">
            {previewRows.map((row, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/10 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-100">
                    {row.Name?.trim() || "—"}
                  </p>
                  {!row.Phone?.trim() && (
                    <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                      No phone
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  {row.Phone?.trim() || "—"}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>{row.Email?.trim() || "—"}</span>
                  <span>{row.City?.trim() || "—"}</span>
                  <span>Src: {row.Source?.trim() || "—"}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden max-h-80 overflow-auto sm:block">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-black/60 backdrop-blur">
                <tr className="text-gray-400">
                  <th className="whitespace-nowrap px-4 py-2 font-medium">
                    Name
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">
                    Phone
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">
                    Email
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">
                    City
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">
                    Age
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">
                    Purpose
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-t border-white/5 text-gray-300">
                    <td className="whitespace-nowrap px-4 py-2">
                      {row.Name?.trim() || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {row.Phone?.trim() || (
                        <span className="text-red-400">missing</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {row.Email?.trim() || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {row.City?.trim() || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {row.Age?.trim() || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {row.Purpose?.trim() || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {row.Source?.trim() || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {remainingCount > 0 && (
            <div className="border-t border-white/10 px-4 py-2 text-center text-xs text-gray-500">
              +{remainingCount} more row{remainingCount === 1 ? "" : "s"} not
              shown
            </div>
          )}
        </div>
      )}

      {/* Progress bar (only visible while a chunked import is running) */}
      {loading && totalChunks > 0 && (
        <div className="relative mt-6">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
            <span>
              Batch {currentChunk} of {totalChunks}
            </span>
            <span>
              {processedRows} / {rowCount || parsedRows.length} rows ·{" "}
              {progressPercent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] via-[#e8c452] to-[#c4a030] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={!fileName || rowCount === 0 || loading}
        className="relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#e8c452] to-[#c4a030] px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-[#D4AF37]/20 transition-all hover:shadow-xl hover:shadow-[#D4AF37]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 sm:w-auto sm:px-6"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Importing... {progressPercent}%
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Import Leads
          </>
        )}
      </button>
    </div>
  );
}
