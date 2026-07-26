"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  X, Phone, MapPin, Calendar, User, Clock, FileText,
  ChevronRight, Loader2, Star, Send, History, AlertCircle,
} from "lucide-react";

interface LeadDetail {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  age: number | null;
  purpose: string | null;
  source: string | null;
  status: string;
  currentStatus: string | null;
  bestTimeToReach: string | null;
  remarks: string | null;
  followUpCount: number;
  isPriority: boolean;
  createdAt: string;
  nextFollowUp: string | null;
  assignedTo?: { id: string; name: string } | null;
  followups: {
    id: string;
    remarks: string;
    followUpNumber: number;
    nextFollowUp: string | null;
    createdAt: string;
    user?: { id: string; name: string } | null;
  }[];
  statusHistory: {
    id: string;
    oldStatus: string;
    newStatus: string;
    changedAt: string;
    changedBy?: { id: string; name: string } | null;
  }[];
}

const STATUS_OPTIONS = [
  { value: "NEW", label: "New", color: "text-blue-400" },
  { value: "CALLED", label: "Called", color: "text-yellow-400" },
  { value: "TRAINING_ATTENDED", label: "Training Attended", color: "text-purple-400" },
  { value: "SEAT_RESERVED", label: "Seat Reserved", color: "text-cyan-400" },
  { value: "NEED_MORE_FOLLOW_UP", label: "Need More Follow Up", color: "text-orange-400" },
  { value: "JOINED", label: "Joined", color: "text-emerald-400" },
  { value: "DEAD", label: "Dead", color: "text-red-400" },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" });
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-PK", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TeamLeadDetailPanel({
  leadId, onClose,
}: {
  leadId: string;
  onClose: () => void;
}) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"info" | "followups" | "history">("info");

  const [cfStatus, setCfStatus] = useState("");
  const [cfRemarks, setCfRemarks] = useState("");
  const [cfSaving, setCfSaving] = useState(false);

  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  const [maxFollowUps, setMaxFollowUps] = useState(4);

  useEffect(() => {
    fetch("/api/salesperson/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.maxFollowUps) setMaxFollowUps(j.data.maxFollowUps);
      })
      .catch(() => {});
  }, []);

  async function fetchLead() {
    try {
      const r = await fetch(`/api/team-leader/leads/${leadId}`);
      const j = await r.json();
      if (j.success) { setLead(j.data); setCfStatus(j.data.status); }
      else toast.error(j.message);
    } catch { toast.error("Failed to load lead."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchLead(); }, [leadId]);

  const isClosed = lead?.status === "JOINED" || lead?.status === "DEAD";

  const isAssignedToMember = !!lead?.assignedTo;

  const maxFollowUpsReached = (lead?.followUpCount || 0) >= maxFollowUps;

  const nextFollowUpReached = (() => {
    if (!lead?.nextFollowUp) return true;

    const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
    const followUpPKT = new Date(new Date(lead.nextFollowUp).getTime() + PKT_OFFSET_MS);
    const nowPKT = new Date(Date.now() + PKT_OFFSET_MS);

    const followUpDateStr = followUpPKT.toISOString().split("T")[0];
    const nowDateStr = nowPKT.toISOString().split("T")[0];

    return followUpDateStr <= nowDateStr;
  })();

  const remarksMissing = !cfRemarks.trim();

  const followUpDisabled =
    cfSaving ||
    isClosed ||
    maxFollowUpsReached ||
    !nextFollowUpReached;

  const followUpButtonLabel = cfSaving
    ? "Saving..."
    : maxFollowUpsReached
    ? "Max Follow Ups Completed"
    : isClosed
    ? "Lead Closed"
    : !nextFollowUpReached
    ? "Waiting For Next Follow Up"
    : remarksMissing
    ? "Add Remarks To Continue"
    : "Complete Follow Up";

  async function completeFollowUp() {
    if (!cfRemarks.trim() || !cfStatus) return;
    if (cfRemarks.trim().length < 10) {
      toast.error("Remarks must be at least 10 characters.");
      return;
    }
    setCfSaving(true);
    try {
      const r = await fetch(`/api/team-leader/leads/${leadId}/complete-followup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: cfRemarks.trim(), status: cfStatus }),
      });
      const j = await r.json();
      if (j.success) { toast.success(j.message); setCfRemarks(""); setShowFollowUpForm(false); fetchLead(); }
      else toast.error(j.message);
    } catch { toast.error("Failed."); }
    finally { setCfSaving(false); }
  }

  async function togglePriority() {
    try {
      const r = await fetch(`/api/team-leader/leads/${leadId}/priority`, { method: "PATCH" });
      const j = await r.json();
      if (j.success) { toast.success(j.message); fetchLead(); }
      else toast.error(j.message);
    } catch { toast.error("Failed."); }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative flex flex-col h-full w-full sm:max-w-lg bg-[#0a0a0a] sm:border-l border-white/[0.06]" onClick={(e) => e.stopPropagation()}>
          <div className="shrink-0 bg-[#0a0a0a] border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-5 w-36 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="h-3 w-28 animate-pulse rounded-lg bg-white/[0.04]" />
              </div>
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-white/[0.06]" />
            </div>
          </div>
          <div className="flex-1 p-5 space-y-5">
            <div className="h-3 w-28 animate-pulse rounded-lg bg-white/[0.06]" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
              ))}
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-3 animate-pulse rounded-lg bg-white/[0.04]" style={{ width: `${90 - i * 15}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative flex flex-col h-full w-full sm:max-w-lg bg-[#0a0a0a] sm:border-l border-white/[0.06] shadow-[0_0_60px_-15px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 bg-[#0a0a0a] border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white truncate">{lead.name || "Unknown"}</h2>
                <button onClick={togglePriority}
                  className={`shrink-0 transition-all ${lead.isPriority ? "text-[#D4AF37]" : "text-white/20 hover:text-[#D4AF37]/50"}`}
                  title={lead.isPriority ? "Remove priority" : "Mark priority"}>
                  <Star size={16} fill={lead.isPriority ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-[11px] text-white/40 hover:text-emerald-400 transition-colors">
                  <Phone size={10} />{lead.phone}
                </a>
                {lead.city && <span className="flex items-center gap-1 text-[11px] text-white/30"><MapPin size={10} />{lead.city}</span>}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40 hover:text-white/70 transition-all shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Assigned member */}
          {lead.assignedTo && (
            <div className="flex items-center gap-1.5 mt-3 rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-[11px] text-blue-400">
              <User size={12} /> {lead.assignedTo.name}
            </div>
          )}

          {/* Next follow-up countdown */}
          {lead.nextFollowUp && (
            <div className={`flex items-center gap-1.5 mt-2 text-[11px] ${nextFollowUpReached ? "text-emerald-400/70" : "text-blue-400/60"}`}>
              <Calendar size={10} />
              <span>
                {nextFollowUpReached
                  ? `Follow-up due today`
                  : `Follow-up on ${formatDate(lead.nextFollowUp)}`
                }
              </span>
            </div>
          )}
          {isClosed && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-400/60">
              <AlertCircle size={10} />
              <span>Lead closed — no further actions</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-white/20">
            Follow-ups: {lead.followUpCount || 0} / {maxFollowUps}
            {maxFollowUpsReached && <span className="text-amber-400/60 ml-1">(limit reached)</span>}
          </div>
        </div>

        {/* Tabs + scrollable content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain">
          {/* Tabs */}
          <div className="shrink-0 flex border-b border-white/[0.06] px-5">
            {(["info", "followups", "history"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`relative px-4 py-3 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  tab === t ? "text-[#D4AF37]" : "text-white/30 hover:text-white/50"
                }`}>
                {t === "info" ? "Details" : t === "followups" ? "Follow-ups" : "History"}
                {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-full" />}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5">
          {/* ═══ INFO TAB ═══ */}
          {tab === "info" && (
            <>
              {/* Lead details */}
              <div className="space-y-3">
                <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Lead Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Phone", value: lead.phone, icon: <Phone size={12} /> },
                    { label: "Email", value: lead.email || "—", icon: <FileText size={12} /> },
                    { label: "City", value: lead.city || "—", icon: <MapPin size={12} /> },
                    { label: "Age", value: lead.age ? String(lead.age) : "—", icon: <User size={12} /> },
                    { label: "Source", value: lead.source || "—", icon: <AlertCircle size={12} /> },
                    { label: "Purpose", value: lead.purpose || "—", icon: <FileText size={12} /> },
                    { label: "Best Time", value: lead.bestTimeToReach || "—", icon: <Clock size={12} /> },
                    { label: "Created", value: formatDate(lead.createdAt), icon: <Calendar size={12} /> },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-white/25 mb-1">{item.icon}<span className="text-[10px] uppercase tracking-wider">{item.label}</span></div>
                      <p className="text-xs text-white/70 truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Status — view only */}
              <div className="space-y-3">
                <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Status</h3>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((s) => (
                    <span key={s.value}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all border ${
                        lead.status === s.value
                          ? `${s.color} border-current bg-current/10`
                          : "border-white/[0.04] text-white/15"
                      }`}>
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Assigned To — view only */}
              <div className="space-y-3">
                <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Assigned To</h3>
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-white/25" />
                    <span className="text-xs text-white/60">
                      {lead.assignedTo ? lead.assignedTo.name : "Unassigned (TL's leads)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {lead.remarks && (
                <div className="space-y-2">
                  <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Latest Remarks</h3>
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-3 py-2.5">
                    <p className="text-xs text-white/50">{lead.remarks}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══ FOLLOW-UPS TAB ═══ */}
          {tab === "followups" && (
            <>
              {/* View-only banner when lead is assigned to a team member */}
              {isAssignedToMember && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-blue-400" />
                    <p className="text-xs font-medium text-blue-400">View Only — Assigned to {lead.assignedTo!.name}</p>
                  </div>
                  <p className="text-[10px] text-white/30">You can only view follow-up history. To make changes, unassign this lead first.</p>
                </div>
              )}

              {/* Toggle button to open/close the follow-up form — TL's own leads only */}
              {!isAssignedToMember && !followUpDisabled && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                  {!showFollowUpForm ? (
                    <>
                      <p className="text-[11px] text-white/40">Follow-ups completed: {lead.followUpCount || 0} / {maxFollowUps}</p>
                      <button onClick={() => setShowFollowUpForm(true)}
                        className="flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-xs font-semibold text-black hover:bg-[#D4AF37]/90 transition-all w-full justify-center">
                        <Send size={12} />
                        Change Status
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Change Status</h3>
                        <button onClick={() => { setShowFollowUpForm(false); setCfRemarks(""); }}
                          className="text-[10px] text-white/30 hover:text-white/60 transition-colors">
                          Cancel
                        </button>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1.5">Status</p>
                        <div className="flex flex-wrap gap-1.5">
                          {STATUS_OPTIONS.map((s) => (
                            <button key={s.value} onClick={() => setCfStatus(s.value)}
                              className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all border ${
                                cfStatus === s.value ? `${s.color} border-current bg-current/10` : "border-white/[0.06] text-white/30 hover:text-white/50"
                              }`}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <textarea value={cfRemarks} onChange={(e) => { setCfRemarks(e.target.value); }}
                          placeholder="Add remarks for status change (min 10 characters)..."
                          className="w-full rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#D4AF37]/30 resize-none h-20 transition-colors"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-[10px] ${cfRemarks.trim().length > 0 && cfRemarks.trim().length < 10 ? "text-amber-400/70" : "text-white/20"}`}>
                            {cfRemarks.trim().length}/10 min
                          </p>
                        </div>
                      </div>
                      <button onClick={completeFollowUp} disabled={cfSaving || !cfRemarks.trim()}
                        className="flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-40 hover:bg-[#D4AF37]/90 transition-all w-full justify-center">
                        {cfSaving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Change Status
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Show disabled state reasons when follow-up is blocked — TL's own leads only */}
              {!isAssignedToMember && followUpDisabled && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
                  <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Follow-up Status</h3>
                  <p className={`text-xs font-medium ${
                    isClosed ? "text-red-400/70" : maxFollowUpsReached ? "text-amber-400/70" : !nextFollowUpReached ? "text-blue-400/70" : "text-white/30"
                  }`}>
                    {followUpButtonLabel}
                  </p>
                  {!nextFollowUpReached && lead?.nextFollowUp && (
                    <p className="text-[10px] text-white/25">
                      Scheduled for: {formatDate(lead.nextFollowUp)}
                    </p>
                  )}
                  <p className="text-[10px] text-white/20">
                    Follow-ups completed: {lead.followUpCount || 0} / {maxFollowUps}
                  </p>
                </div>
              )}

              {/* Follow-up history */}
              <div className="space-y-2">
                <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Follow-up History ({lead.followups.length})</h3>
                {lead.followups.length === 0 ? (
                  <p className="text-[11px] text-white/20">No follow-ups yet.</p>
                ) : (
                  <div className="space-y-2">
                    {lead.followups.map((f) => (
                      <div key={f.id} className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-white/30">
                            {f.followUpNumber > 0 ? `Follow-up #${f.followUpNumber}` : "Note"}
                          </span>
                          <span className="text-[10px] text-white/20">{formatDateTime(f.createdAt)}</span>
                        </div>
                        <p className="text-xs text-white/60">{f.remarks}</p>
                        {f.user && <p className="text-[10px] text-white/20 mt-1">by {f.user.name}</p>}
                        {f.nextFollowUp && (
                          <p className="text-[10px] text-[#D4AF37]/50 mt-1">Next: {formatDate(f.nextFollowUp)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══ HISTORY TAB ═══ */}
          {tab === "history" && (
            <div className="space-y-2">
              <h3 className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">Status History ({lead.statusHistory.length})</h3>
              {lead.statusHistory.length === 0 ? (
                <p className="text-[11px] text-white/20">No status changes yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/[0.06]" />
                  <div className="space-y-3">
                    {lead.statusHistory.map((h) => (
                      <div key={h.id} className="relative flex items-start gap-3 pl-0">
                        <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/60 border border-white/[0.1]">
                          <History size={10} className="text-white/40" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-white/40">{STATUS_OPTIONS.find((s) => s.value === h.oldStatus)?.label || h.oldStatus}</span>
                            <ChevronRight size={10} className="text-white/20" />
                            <span className="font-medium text-white/70">{STATUS_OPTIONS.find((s) => s.value === h.newStatus)?.label || h.newStatus}</span>
                          </div>
                          <p className="text-[10px] text-white/20 mt-0.5">
                            {formatDateTime(h.changedAt)} {h.changedBy && `by ${h.changedBy.name}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}