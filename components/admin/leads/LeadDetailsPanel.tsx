"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LeadDetails } from "@/types/lead";
import {
  X, User, Phone, Mail, MapPin, Briefcase, Target,
  Calendar, Clock, CheckCircle, History, MessageSquareText,
  ArrowRight, Activity, Zap,
} from "lucide-react";
import { toast } from "sonner";
import EditLeadDialog from "@/components/admin/leads/EditLeadDialog";
import { formatDate, formatDateTime } from "@/lib/format-date";

type Props = { onUpdate?: () => void };

export default function LeadDetailsPanel({ onUpdate }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");

  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState<LeadDetails | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isOpen = Boolean(leadId);

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("leadId");
      router.replace(`?${params.toString()}`, { scroll: false });
    }, 100);
  }, [router, searchParams]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      setLead(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/leads/${leadId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) setLead(json.data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [leadId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  async function completeFollowUp() {
    if (!lead?.id) return;
    try {
      setFollowLoading(true);
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDone: true, remarks: "Follow up completed" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Follow up completed");
        const r2 = await fetch(`/api/admin/leads/${lead.id}`, { cache: "no-store" });
        const j2 = await r2.json();
        if (j2.success) setLead(j2.data);
        onUpdate?.();
      } else {
        toast.error(json.message || "Follow up failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setFollowLoading(false);
    }
  }

  if (!isOpen) return null;

  const followPct = lead ? Math.min(((lead.followUpCount || 0) / 4) * 100, 100) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Panel — half screen */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] shadow-[−20px_0_60px_-20px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-in-out sm:w-1/2 sm:min-w-[480px] ${visible ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Lead Details</h2>
          <button onClick={close} className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-[#D4AF37] scrollbar-track-[#111111]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
              <p className="text-sm text-white/40">Loading lead…</p>
            </div>
          ) : lead ? (
            <div className="space-y-8">
              {/* Summary cards with icons */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={16} className="text-[#D4AF37]" />
                    <p className="text-[11px] uppercase tracking-wide text-white/40">Follow Ups</p>
                  </div>
                  <p className="text-2xl font-semibold text-[#D4AF37]">
                    {lead.followUpCount || 0}
                    <span className="ml-1 text-sm font-normal text-white/30">/ 4</span>
                  </p>
                </div>

                {lead.firstResponseAt ? (
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={16} className="text-blue-400" />
                      <p className="text-[11px] uppercase tracking-wide text-white/40">Response</p>
                    </div>
                    <p className="text-lg font-semibold text-blue-400">
                      {(() => {
                        const diffMs = new Date(lead.firstResponseAt).getTime() - new Date(lead.createdAt).getTime();
                        const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
                        if (diffHrs < 1) return "< 1h";
                        if (diffHrs < 24) return `${diffHrs}h`;
                        return `${Math.floor(diffHrs / 24)}d ${diffHrs % 24}h`;
                      })()}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={16} className="text-white/20" />
                      <p className="text-[11px] uppercase tracking-wide text-white/40">Response</p>
                    </div>
                    <p className="text-lg font-semibold text-white/20">—</p>
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} className="text-white/40" />
                    <p className="text-[11px] uppercase tracking-wide text-white/40">Source</p>
                  </div>
                  <p className="text-sm font-semibold text-white/60 truncate">{lead.source || "—"}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-wide text-white/40">Follow Up Progress</span>
                  <span className="text-sm font-semibold text-[#D4AF37]">{Math.round(followPct)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]/60 transition-all duration-500"
                    style={{ width: `${followPct}%` }}
                  />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    disabled={followLoading || (lead.followUpCount ?? 0) >= 4 || lead.status === "DEAD"}
                    onClick={completeFollowUp}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-emerald-400 disabled:opacity-40"
                  >
                    <CheckCircle size={15} />
                    {followLoading ? "Processing…" : "Complete Follow Up"}
                  </button>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="rounded-xl bg-[#D4AF37] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#D4AF37]/85"
                  >
                    Edit Lead
                  </button>
                  {lead.nextFollowUp && (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-amber-400/70">
                      <Calendar size={13} />
                      Next: {formatDate(lead.nextFollowUp)}
                    </span>
                  )}
                </div>
              </div>

              <EditLeadDialog
                open={editOpen}
                setOpen={setEditOpen}
                lead={lead}
                onUpdate={() => {
                  fetch(`/api/admin/leads/${lead.id}`, { cache: "no-store" })
                    .then((r) => r.json())
                    .then((j) => { if (j.success) setLead(j.data); });
                  onUpdate?.();
                }}
              />

              {/* Lead Information */}
              <div>
                <SectionTitle icon={<User size={16} />} title="Lead Information" />
                <div className="grid grid-cols-2 gap-3">
                  <Info icon={<User size={16} />} label="Name" value={lead.name} />
                  <Info icon={<Phone size={16} />} label="Phone" value={lead.phone} />
                  <Info icon={<Mail size={16} />} label="Email" value={lead.email} />
                  <Info icon={<MapPin size={16} />} label="City" value={lead.city} />
                  <Info icon={<Briefcase size={16} />} label="Employment" value={lead.currentStatus} />
                  <Info icon={<Target size={16} />} label="Purpose" value={lead.purpose} />
                  <Info icon={<Calendar size={16} />} label="Status" value={lead.status} />
                  <Info icon={<User size={16} />} label="Assigned To" value={lead.assignedTo?.name} />
                  <Info icon={<Clock size={16} />} label="Best Time To Reach" value={lead.bestTimeToReach} />
                  <Info icon={<CheckCircle size={16} />} label="Training" value={lead.willingToAttendTraining ? "Yes" : "No"} />
                  <Info icon={<Calendar size={16} />} label="Next Follow Up" value={lead.nextFollowUp ? formatDateTime(lead.nextFollowUp) : "-"} />
                  <Info icon={<User size={16} />} label="Age" value={lead.age} />
                </div>
              </div>

              {/* Current Remarks */}
              <div>
                <SectionTitle icon={<MessageSquareText size={16} />} title="Current Remarks" />
                <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                    {lead.remarks || "No remarks available."}
                  </p>
                </div>
              </div>

              {/* Follow Up History */}
              <div>
                <SectionTitle icon={<History size={16} />} title="Follow Up History" />
                {lead.followups?.length ? (
                  <div className="space-y-3">
                    {lead.followups.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-5 transition-colors hover:border-[#D4AF37]/25">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/[0.08] text-xs font-semibold uppercase text-[#D4AF37]">
                              {(item.user?.name || "U")[0]}
                            </div>
                            <p className="font-medium text-white">{item.user?.name || "Unknown User"}</p>
                            {item.followUpNumber === 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                                <MessageSquareText size={10} />
                                Note
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                <CheckCircle size={10} />
                                Follow Up #{item.followUpNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/35">{formatDateTime(item.createdAt)}</p>
                        </div>
                        <div className="mt-3.5 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                          <p className="whitespace-pre-wrap text-sm text-white/70">{item.remarks}</p>
                        </div>
                        {item.nextFollowUp && (
                          <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-4 py-2.5">
                            <Calendar size={14} className="text-[#D4AF37]" />
                            <p className="text-sm text-[#D4AF37]">
                              Next Follow Up: {formatDateTime(item.nextFollowUp)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState label="No follow up history found." />
                )}
              </div>

              {/* Status History */}
              <div>
                <SectionTitle icon={<History size={16} />} title="Status History" />
                {lead.statusHistory?.length ? (
                  <div className="space-y-3">
                    {lead.statusHistory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 p-5 transition-colors hover:border-[#D4AF37]/25">
                        <div>
                          <p className="flex items-center gap-2 font-medium">
                            <span className="text-white/50">{item.oldStatus}</span>
                            <ArrowRight size={14} className="text-[#D4AF37]" />
                            <span className="text-[#D4AF37]">{item.newStatus}</span>
                          </p>
                          <p className="mt-1.5 text-xs text-white/35">
                            Changed by {item.changedBy?.name || "Unknown User"}
                          </p>
                        </div>
                        <div className="shrink-0 text-xs text-white/30">
                          {formatDateTime(item.changedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState label="No status history available." />
                )}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-sm text-white/40">Lead not found.</div>
          )}
        </div>
      </div>
    </>
  );
}

function SectionTitle({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/[0.08] text-[#D4AF37]">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-center text-sm text-white/35">
      {label}
    </div>
  );
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4 transition-colors hover:border-[#D4AF37]/35">
      <div className="flex items-center gap-2 text-[#D4AF37]/80">
        {icon}
        <p className="text-[11px] font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2.5 wrap-break-word text-sm font-medium text-white">
        {value !== null && value !== undefined && value !== "" ? String(value) : "-"}
      </p>
    </div>
  );
}
