"use client";

import { useState } from "react";
import type { LeadDetails } from "@/types/lead";
import {
  Eye,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Target,
  Calendar,
  Clock,
  CheckCircle,
  History,
  MessageSquareText,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import EditLeadDialog from "@/components/admin/leads/EditLeadDialog";
import { formatDate, formatDateTime, formatTime, formatDateShort } from "@/lib/format-date";

type LeadDetailsDialogProps = {
  leadId: string;
  onUpdate?: () => void;
};

type User = {
  id: string;
  name: string;
};

type FollowUp = {
  id: string;
  user?: User | null;
  createdAt: string;
  remarks: string;
  nextFollowUp?: string | null;
};

type Activity = {
  id: string;
  user?: User | null;
  createdAt: string;
  message: string;
};

type StatusHistory = {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedBy?: User | null;
  changedAt: string;
};

export default function LeadDetailsDialog({
  leadId,
  onUpdate,
}: LeadDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState<LeadDetails | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  async function getLead() {
    try {
      setLoading(true);

      const res = await fetch(`/api/admin/leads/${leadId}`);

      const json = await res.json();

      if (!json.success) {

        return;
      }

      setLead(json.data);
    } catch (err) {

    } finally {
      setLoading(false);
    }
  }
  async function completeFollowUp() {
    if (!lead?.id) return;

    try {
      setFollowLoading(true);

      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          followUpDone: true,
          remarks: "Follow up completed",
        }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success("Follow up completed");

        await getLead();

        onUpdate?.();
      } else {
        toast.error(json.message || "Follow up failed");
      }
    } catch (error) {


      toast.error("Something went wrong");
    } finally {
      setFollowLoading(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);

        if (value) {
          getLead();
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            className="
            gap-1.5
            rounded-xl
            border
            border-[#D4AF37]/30
            bg-[#D4AF37]/[0.06]
            text-[#D4AF37]
            transition-colors
            hover:border-[#D4AF37]/50
            hover:bg-[#D4AF37]/10
            "
          >
            <Eye size={16} />
            View
          </Button>
        }
      />
      <EditLeadDialog
        open={editOpen}
        setOpen={setEditOpen}
        lead={lead}
        onUpdate={() => {
          getLead();
          onUpdate?.();
        }}
      />
      <DialogContent
        className="
    max-w-[70vw]!
    w-[70vw]
    max-h-[90vh]
    overflow-y-auto
    rounded-[28px]
    border
    border-[#D4AF37]/20
    bg-gradient-to-br
    from-[#171717]
    to-[#0d0d0d]
    text-white
    shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]
    /* Scrollbar Styling Classes */
    scrollbar-thin 
    scrollbar-thumb-[#D4AF37] 
    scrollbar-track-[#111111]
  "
      >
        <DialogHeader>
          <DialogTitle
            className="
            text-2xl
            font-semibold
            tracking-tight
            text-white
            "
          >
            Lead Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div
            className="
    rounded-2xl
    border
    border-[#D4AF37]/20
    bg-[#D4AF37]/[0.06]
    px-5
    py-3
    "
          >
            <p className="text-[11px] uppercase tracking-wide text-white/40">
              Follow Ups Done
            </p>

            <p className="mt-0.5 text-2xl font-semibold text-[#D4AF37]">
              {lead?.followUpCount || 0}
              <span className="ml-1 text-sm font-normal text-white/30">
                / 4
              </span>
            </p>
          </div>

          {/* SLA Response Time */}
          {lead?.firstResponseAt && (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] px-5 py-3">
              <p className="text-[11px] uppercase tracking-wide text-white/40">First Response Time</p>
              <p className="mt-0.5 text-lg font-semibold text-blue-400">
                {(() => {
                  const created = new Date(lead.createdAt);
                  const responded = new Date(lead.firstResponseAt);
                  const diffMs = responded.getTime() - created.getTime();
                  const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
                  if (diffHrs < 1) return "< 1 hour";
                  if (diffHrs < 24) return `${diffHrs} hours`;
                  return `${Math.floor(diffHrs / 24)}d ${diffHrs % 24}h`;
                })()}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5">
                {formatDateTime(lead.firstResponseAt)}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              disabled={
                followLoading ||
                (lead?.followUpCount ?? 0) >= 4 ||
                lead?.status === "DEAD"
              }
              onClick={completeFollowUp}
              className="
  gap-1.5
  rounded-xl
  bg-emerald-500
  text-black
  transition-colors
  hover:bg-emerald-400
  disabled:opacity-40
  "
            >
              <CheckCircle size={16} />
              {followLoading ? "Processing…" : "Complete Follow Up"}
            </Button>

            <Button
              onClick={() => setEditOpen(true)}
              className="
      rounded-xl
      bg-[#D4AF37]
      text-black
      transition-colors
      hover:bg-[#D4AF37]/85
      "
            >
              Edit Lead
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div
              className="
              h-8
              w-8
              animate-spin
              rounded-full
              border-2
              border-[#D4AF37]/20
              border-t-[#D4AF37]
              "
            />
            <p className="text-sm text-white/40">Loading lead…</p>
          </div>
        ) : lead ? (
          <div className="space-y-9 pt-2">
            {/* BASIC INFORMATION */}

            <div>
              <SectionTitle
                icon={<User size={16} />}
                title="Lead Information"
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Info
                  icon={<User size={16} />}
                  label="Name"
                  value={lead.name}
                />

                <Info
                  icon={<Phone size={16} />}
                  label="Phone"
                  value={lead.phone}
                />

                <Info
                  icon={<Mail size={16} />}
                  label="Email"
                  value={lead.email}
                />

                <Info
                  icon={<MapPin size={16} />}
                  label="City"
                  value={lead.city}
                />

                <Info
                  icon={<Briefcase size={16} />}
                  label="Employment"
                  value={lead.currentStatus}
                />

                <Info
                  icon={<Target size={16} />}
                  label="Purpose"
                  value={lead.purpose}
                />

                <Info
                  icon={<Calendar size={16} />}
                  label="Status"
                  value={lead.status}
                />

                <Info
                  icon={<User size={16} />}
                  label="Assigned To"
                  value={lead.assignedTo?.name}
                />

                <Info
                  icon={<Clock size={16} />}
                  label="Best Time To Reach"
                  value={lead.bestTimeToReach}
                />

                <Info
                  icon={<CheckCircle size={16} />}
                  label="Training"
                  value={lead.willingToAttendTraining ? "Yes" : "No"}
                />

                <Info
                  icon={<Calendar size={16} />}
                  label="Next Follow Up"
                  value={
                    lead.nextFollowUp
                      ? formatDateTime(lead.nextFollowUp)
                      : "-"
                  }
                />

                <Info icon={<User size={16} />} label="Age" value={lead.age} />
              </div>
            </div>
            {/* CURRENT REMARKS */}

            <div>
              <SectionTitle
                icon={<MessageSquareText size={16} />}
                title="Current Lead Remarks"
              />

              <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                  {lead.remarks || "No remarks available."}
                </p>
              </div>
            </div>

            {/* FOLLOW UP HISTORY */}

            <div>
              <SectionTitle
                icon={<History size={16} />}
                title="Follow Up History"
              />

              {lead.followups?.length ? (
                <div className="space-y-3">
                  {lead.followups.map((item) => (
                    <div
                      key={item.id}
                      className="
                      rounded-2xl
                      border
                      border-white/10
                      bg-black/25
                      p-5
                      transition-colors
                      hover:border-[#D4AF37]/25
                      "
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="
                            flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            border
                            border-[#D4AF37]/25
                            bg-[#D4AF37]/[0.08]
                            text-xs
                            font-semibold
                            uppercase
                            text-[#D4AF37]
                            "
                          >
                            {(item.user?.name || "U")[0]}
                          </div>
                          <p className="font-medium text-white">
                            {item.user?.name || "Unknown User"}
                          </p>
                        </div>

                        <p className="text-xs text-white/35">
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>

                      <div className="mt-3.5 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                        <p className="whitespace-pre-wrap text-sm text-white/70">
                          {item.remarks}
                        </p>
                      </div>

                      {item.nextFollowUp && (
                        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-4 py-2.5">
                          <Calendar size={14} className="text-[#D4AF37]" />
                          <p className="text-sm text-[#D4AF37]">
                            Next Follow Up:{" "}
                            {formatDateTime(item.nextFollowUp)}
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

            {/* ACTIVITY HISTORY */}

            {/* STATUS HISTORY */}

            <div>
              <SectionTitle
                icon={<History size={16} />}
                title="Status History"
              />

              {lead.statusHistory?.length ? (
                <div className="space-y-3">
                  {lead.statusHistory.map((item) => (
                    <div
                      key={item.id}
                      className="
                      flex
                      items-center
                      justify-between
                      gap-4
                      rounded-2xl
                      border
                      border-white/10
                      bg-black/25
                      p-5
                      transition-colors
                      hover:border-[#D4AF37]/25
                      "
                    >
                      <div>
                        <p className="flex items-center gap-2 font-medium">
                          <span className="text-white/50">
                            {item.oldStatus}
                          </span>
                          <ArrowRight size={14} className="text-[#D4AF37]" />
                          <span className="text-[#D4AF37]">
                            {item.newStatus}
                          </span>
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
          <div className="py-20 text-center text-sm text-white/40">
            Lead not found.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon?: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div
        className="
        flex
        h-7
        w-7
        items-center
        justify-center
        rounded-lg
        border
        border-[#D4AF37]/25
        bg-[#D4AF37]/[0.08]
        text-[#D4AF37]
        "
      >
        {icon}
      </div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      className="
      rounded-2xl
      border
      border-white/10
      bg-black/25
      p-6
      text-center
      text-sm
      text-white/35
      "
    >
      {label}
    </div>
  );
}

type InfoProps = {
  icon?: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
};

function Info({ icon, label, value }: InfoProps) {
  return (
    <div
      className="
      rounded-xl
      border
      border-white/10
      bg-black/25
      p-4
      transition-colors
      hover:border-[#D4AF37]/35
      "
    >
      <div className="flex items-center gap-2 text-[#D4AF37]/80">
        {icon}
        <p className="text-[11px] font-medium uppercase tracking-wide">
          {label}
        </p>
      </div>

      <p
        className="
        mt-2.5
        wrap-break-word
        text-sm
        font-medium
        text-white
        "
      >
        {value !== null && value !== undefined && value !== ""
          ? String(value)
          : "-"}
      </p>
    </div>
  );
}
