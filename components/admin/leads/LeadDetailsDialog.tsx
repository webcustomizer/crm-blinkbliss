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
        console.log(json.message);
        return;
      }

      setLead(json.data);
    } catch (err) {
      console.log(err);
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
      console.log(error);

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
            bg-[#111111]
            border
            border-[#D4AF37]/30
            text-[#D4AF37]
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
    bg-[#111111]
    border
    border-[#D4AF37]/30
    text-white
    /* Scrollbar Styling Classes */
    scrollbar-thin 
    scrollbar-thumb-[#D4AF37] 
    scrollbar-track-[#111111]
  "
      >
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#D4AF37]">
            Lead Details
          </DialogTitle>
        </DialogHeader>
        <div className="flex justify-between items-center">
          <div
            className="
    rounded-xl
    border
    border-[#D4AF37]/20
    bg-[#D4AF37]/10
    px-4
    py-2
    "
          >
            <p className="text-xs text-gray-400">Follow Ups Done</p>

            <p className="text-xl font-bold text-[#D4AF37]">
              {lead?.followUpCount || 0}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              disabled={
                followLoading ||
                (lead?.followUpCount ?? 0) >= 4 ||
                lead?.status === "DEAD"
              }
              onClick={completeFollowUp}
              className="
  bg-emerald-500
  text-black
  hover:bg-emerald-400
  disabled:opacity-50
  "
            >
              {followLoading ? "Processing..." : "Complete Follow Up"}
            </Button>

            <Button
              onClick={() => setEditOpen(true)}
              className="
      bg-[#D4AF37]
      text-black
      hover:bg-[#D4AF37]/80
      "
            >
              Edit Lead
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading Lead...</div>
        ) : lead ? (
          <div className="space-y-8">
            {/* BASIC INFORMATION */}

            <div>
              <h2 className="mb-5 text-xl font-bold text-[#D4AF37]">
                Lead Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Info
                  icon={<User size={18} />}
                  label="Name"
                  value={lead.name}
                />

                <Info
                  icon={<Phone size={18} />}
                  label="Phone"
                  value={lead.phone}
                />

                <Info
                  icon={<Mail size={18} />}
                  label="Email"
                  value={lead.email}
                />

                <Info
                  icon={<MapPin size={18} />}
                  label="City"
                  value={lead.city}
                />

                <Info
                  icon={<Briefcase size={18} />}
                  label="Employment"
                  value={lead.currentStatus}
                />

                <Info
                  icon={<Target size={18} />}
                  label="Purpose"
                  value={lead.purpose}
                />

                <Info
                  icon={<Calendar size={18} />}
                  label="Status"
                  value={lead.status}
                />

                <Info
                  icon={<User size={18} />}
                  label="Assigned To"
                  value={lead.assignedTo?.name}
                />

                <Info
                  icon={<Clock size={18} />}
                  label="Best Time To Reach"
                  value={lead.bestTimeToReach}
                />

                <Info
                  icon={<CheckCircle size={18} />}
                  label="Training"
                  value={lead.willingToAttendTraining ? "Yes" : "No"}
                />

                <Info
                  icon={<Calendar size={18} />}
                  label="Next Follow Up"
                  value={
                    lead.nextFollowUp
                      ? new Date(lead.nextFollowUp).toLocaleString()
                      : "-"
                  }
                />

                <Info icon={<User size={18} />} label="Age" value={lead.age} />
              </div>
            </div>
            {/* CURRENT REMARKS */}

            <div>
              <h2 className="mb-5 text-xl font-bold text-[#D4AF37]">
                Current Lead Remarks
              </h2>

              <div className="rounded-xl border border-[#D4AF37]/20 bg-black/30 p-5">
                <p className="whitespace-pre-wrap text-gray-200">
                  {lead.remarks || "No remarks available."}
                </p>
              </div>
            </div>

            {/* FOLLOW UP HISTORY */}

            <div>
              <h2 className="mb-5 text-xl font-bold text-[#D4AF37]">
                Follow Up History
              </h2>

              {lead.followups?.length ? (
                <div className="space-y-4">
                  {lead.followups.map((item) => (
                    <div
                      key={item.id}
                      className="
                      rounded-xl
                      border
                      border-[#D4AF37]/20
                      bg-black/30
                      p-5
                      "
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[#D4AF37]">
                            {item.user?.name || "Unknown User"}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg bg-[#D4AF37]/5 p-4">
                        <p className="whitespace-pre-wrap text-white">
                          {item.remarks}
                        </p>
                      </div>

                      {item.nextFollowUp && (
                        <div className="mt-4 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                          <p className="text-sm text-[#D4AF37]">
                            <strong>Next Follow Up:</strong>{" "}
                            {new Date(item.nextFollowUp).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="
                  rounded-xl
                  border
                  border-white/10
                  bg-black/30
                  p-6
                  text-center
                  text-gray-400
                  "
                >
                  No Follow Up History Found.
                </div>
              )}
            </div>

            {/* ACTIVITY HISTORY */}

            {/* STATUS HISTORY */}

            <div>
              <h2 className="mb-5 text-xl font-bold text-[#D4AF37]">
                Status History
              </h2>

              {lead.statusHistory?.length ? (
                <div className="space-y-4">
                  {lead.statusHistory.map((item) => (
                    <div
                      key={item.id}
                      className="
                      rounded-xl
                      border
                      border-[#D4AF37]/20
                      bg-black/30
                      p-5
                      "
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[#D4AF37]">
                            {item.oldStatus}

                            <span className="mx-2 text-white">→</span>

                            {item.newStatus}
                          </p>

                          <p className="mt-2 text-sm text-gray-400">
                            Changed By: {item.changedBy?.name || "Unknown User"}
                          </p>
                        </div>

                        <div className="text-xs text-gray-500">
                          {new Date(item.changedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="
                  rounded-xl
                  border
                  border-white/10
                  bg-black/30
                  p-6
                  text-center
                  text-gray-400
                  "
                >
                  No Status History Available.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400">Lead not found.</div>
        )}
      </DialogContent>
    </Dialog>
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
      border-[#D4AF37]/20
      bg-black/30
      p-4
      transition
      hover:border-[#D4AF37]/50
      "
    >
      <div className="flex items-center gap-2 text-[#D4AF37]">
        {icon}
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>

      <p
        className="
        mt-3
        wrap-break-word
        text-sm
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
