"use client";

import { useCallback, useEffect, useState } from "react";

import { X, Phone, MapPin, CalendarClock, History, Edit3 } from "lucide-react";

import LeadStatusBadge from "./LeadStatusBadge";
import { toast } from "sonner";

interface LeadDetailsProps {
  leadId: string;
  onClose: () => void;
}

interface LeadFieldProps {
  label: string;
  value: string | number | undefined;
  field: string;
  formValue: string;
  editingFields: string[];
  toggleEdit: (field: string) => void;
  updateField: (field: string, value: string) => void;
  disabled: boolean;
  type?: string;
}

function LeadField({
  label,
  value,
  field,
  formValue,
  editingFields,
  toggleEdit,
  updateField,
  disabled,
  type = "text",
}: LeadFieldProps) {
  const editing = editingFields.includes(field);

  return (
    <div
      className="
      group
      rounded-2xl
      border
      border-white/5
      bg-gradient-to-br
      from-[#1b1b1b]
      to-[#121212]
      p-4
      transition
      hover:border-[#D4AF37]/30
      "
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>

        {!disabled && !value && (
          <button
            onClick={() => toggleEdit(field)}
            className="
            rounded-full
            bg-[#D4AF37]/10
            px-3
            py-1
            text-xs
            font-medium
            text-[#D4AF37]
            transition
            hover:bg-[#D4AF37]
            hover:text-black
            "
          >
            {editing ? "Cancel" : "Add"}
          </button>
        )}
      </div>

      {editing ? (
        <input
          type={type}
          value={formValue}
          onChange={(e) => updateField(field, e.target.value)}
          className="
          mt-3
          w-full
          rounded-xl
          border
          border-[#D4AF37]/20
          bg-black/40
          px-4
          py-3
          text-sm
          text-white
          outline-none
          transition
          focus:border-[#D4AF37]
          "
        />
      ) : (
        <p className="mt-3 text-sm font-medium text-white">
          {value || <span className="text-zinc-600">Not Added</span>}
        </p>
      )}
    </div>
  );
}
export default function LeadDetails({ leadId, onClose }: LeadDetailsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lead, setLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isClosed = lead?.status === "JOINED" || lead?.status === "DEAD";

  const maxFollowUpsReached = (lead?.followUpCount || 0) >= 4;

  const nextFollowUpReached =
    !lead?.nextFollowUp || new Date(lead.nextFollowUp) <= new Date();

  const followUpDisabled =
    saving || isClosed || maxFollowUpsReached || !nextFollowUpReached;

  const [form, setForm] = useState({
    name: "",
    email: "",
    city: "",
    age: "",
    purpose: "",
    currentStatus: "",
    bestTimeToReach: "",
    willingToAttendTraining: "",
    remarks: "",
    status: "NEW",
  });

  const [editingFields, setEditingFields] = useState<string[]>([]);

  function updateField(name: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function toggleEdit(field: string) {
    setEditingFields((prev) =>
      prev.includes(field)
        ? prev.filter((item) => item !== field)
        : [...prev, field],
    );
  }

  const getLeadDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/salesperson/leads/${leadId}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok) {
        const leadData = data.lead;
        console.log(
          "LEAD AFTER REFRESH:",
          leadData.id,
          leadData.nextFollowUp,
          leadData.status,
        );
        setLead(leadData);

        setForm({
          name: leadData.name || "",
          email: leadData.email || "",
          city: leadData.city || "",
          age: leadData.age?.toString() || "",
          purpose: leadData.purpose || "",
          currentStatus: leadData.currentStatus || "",
          bestTimeToReach: leadData.bestTimeToReach || "",
          willingToAttendTraining: leadData.willingToAttendTraining
            ? "YES"
            : "NO",
          remarks: "",
          status: leadData.status,
        });
      }
    } catch (error) {
      console.log("Lead Details Error:", error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);
  // lead status
  async function updateLeadStatus(newStatus: string) {
    try {
      setSaving(true);

      const res = await fetch(`/api/salesperson/leads/${leadId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Status update failed");
        return;
      }

      await getLeadDetails();

      toast.success("Status updated successfully");
    } catch (error) {
      console.log(error);

      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function completeFollowUp() {
    try {
      setSaving(true);

      const res = await fetch(
        `/api/salesperson/leads/${leadId}/complete-followup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Something went wrong");
        return;
      }

      await getLeadDetails();

      toast.success("Follow up completed successfully");
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    async function loadLeadDetails() {
      await getLeadDetails();
    }

    loadLeadDetails();
  }, [leadId, getLeadDetails]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="text-[#D4AF37]">Loading Lead...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="rounded-xl border border-[#D4AF37]/20 bg-[#161616] px-6 py-4 text-[#D4AF37]">
          Lead not found
        </div>
      </div>
    );
  }

  async function saveLeadInformation() {
    try {
      setSaving(true);

      const res = await fetch(`/api/salesperson/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      setEditingFields([]);

      await getLeadDetails();

      toast.success("Lead information updated successfully.");
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div onClick={onClose} className="flex-1 bg-black/60" />

      {/* Sidebar */}
      <div
        className="
  h-full
  w-full
  max-w-2xl
  overflow-y-auto
  border-l
  border-white/10
  bg-[#080808]
  shadow-[0_0_50px_rgba(212,175,55,0.08)]
  pb-24
  md:pb-6
  "
      >
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className="
        flex
        h-11
        w-11
        items-center
        justify-center
        rounded-2xl
        bg-[#D4AF37]/10
        text-[#D4AF37]
        "
                >
                  <History size={20} />
                </div>

                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    Lead Details
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Manage lead information and follow ups
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="
    rounded-2xl
    border
    border-white/10
    bg-white/5
    p-3
    text-zinc-400
    transition
    hover:border-[#D4AF37]/40
    hover:text-[#D4AF37]
    "
            >
              <X size={20} />
            </button>
          </div>

          {/* Basic Information */}
          <div
            className="
mt-8
rounded-3xl
border
border-white/10
bg-gradient-to-br
from-[#171717]
to-[#0d0d0d]
p-6
shadow-xl
"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  className="
text-2xl
font-bold
tracking-tight
text-white
"
                >
                  {lead.name || "Unknown Lead"}
                </h3>

                <div className="mt-5 space-y-4 text-sm text-zinc-400">
                  <p className="flex items-center gap-3">
                    <span className="rounded-xl bg-white/5 p-2">
                      <Phone size={15} />
                    </span>

                    {lead.phone}
                  </p>

                  <p className="flex items-center gap-3">
                    <span className="rounded-xl bg-white/5 p-2">
                      <MapPin size={15} />
                    </span>

                    {lead.city || "-"}
                  </p>

                  <p className="flex items-center gap-3">
                    <span className="rounded-xl bg-white/5 p-2">
                      <CalendarClock size={15} />
                    </span>

                    {lead.nextFollowUp
                      ? new Date(lead.nextFollowUp).toLocaleString()
                      : "No Follow Up"}
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <LeadStatusBadge status={lead.status} />
              </div>
            </div>
          </div>

          {/* Lead Information */}
          <div className="mt-6 rounded-xl bg-[#111111] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#D4AF37]">
                Lead Information
              </h3>
              <Edit3 size={16} className="text-zinc-500" />
            </div>

            <div className="space-y-4">
              {/* Name */}
              <LeadField
                label="Name"
                value={lead.name}
                field="name"
                formValue={form.name}
                editingFields={editingFields}
                toggleEdit={toggleEdit}
                updateField={updateField}
                disabled={isClosed}
              />

              {/* Email */}
              <LeadField
                label="Email"
                value={lead.email}
                field="email"
                formValue={form.email}
                editingFields={editingFields}
                toggleEdit={toggleEdit}
                updateField={updateField}
                disabled={isClosed}
              />

              {/* City */}
              <LeadField
                label="City"
                value={lead.city}
                field="city"
                formValue={form.city}
                editingFields={editingFields}
                toggleEdit={toggleEdit}
                updateField={updateField}
                disabled={isClosed}
              />

              {/* Age */}
              <LeadField
                label="Age"
                value={lead.age}
                field="age"
                formValue={form.age}
                editingFields={editingFields}
                toggleEdit={toggleEdit}
                updateField={updateField}
                disabled={isClosed}
                type="number"
              />

              {/* Purpose */}
              <LeadField
                label="Purpose"
                value={lead.purpose}
                field="purpose"
                formValue={form.purpose}
                editingFields={editingFields}
                toggleEdit={toggleEdit}
                updateField={updateField}
                disabled={isClosed}
              />

              {/* Current Status */}
              <LeadField
                label="Current Status"
                value={lead.currentStatus}
                field="currentStatus"
                formValue={form.currentStatus}
                editingFields={editingFields}
                toggleEdit={toggleEdit}
                updateField={updateField}
                disabled={isClosed}
              />

              {/* Best Time */}
              <LeadField
                label="Best Time To Reach"
                value={lead.bestTimeToReach}
                field="bestTimeToReach"
                formValue={form.bestTimeToReach}
                editingFields={editingFields}
                toggleEdit={toggleEdit}
                updateField={updateField}
                disabled={isClosed}
              />

              {/* Training */}
              <LeadField
                label="Willing To Attend Training"
                value={lead.willingToAttendTraining ? "YES" : "NO"}
                field="willingToAttendTraining"
                formValue={form.willingToAttendTraining}
                editingFields={editingFields}
                toggleEdit={toggleEdit}
                updateField={updateField}
                disabled={isClosed}
              />

              {editingFields.length > 0 && (
                <button
                  onClick={saveLeadInformation}
                  disabled={saving}
                  className="mt-5 w-full rounded-xl bg-[#D4AF37] py-3 font-semibold  text-black    transition    hover:opacity-90"
                >
                  {saving ? "Saving..." : "Save Lead Information"}
                </button>
              )}
            </div>
          </div>

          {/* Follow Up History */}
          <div className="mt-6 rounded-xl bg-[#111111] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#D4AF37]">
              <History size={16} />
              Follow Up History
            </h3>
            <div className="space-y-3">
              {lead.followups?.length > 0 ? (
                lead.followups.map(
                  (item: {
                    id: string;
                    remarks: string;
                    followUpNumber: number;
                    createdAt: string;
                  }) => (
                    <div key={item.id} className="rounded-lg bg-[#1a1a1a] p-3">
                      <p className="text-sm text-white">{item.remarks}</p>
                      <div className="mt-2 flex justify-between text-xs text-zinc-500">
                        <span>Follow Up #{item.followUpNumber}</span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ),
                )
              ) : (
                <p className="text-sm text-zinc-500">No follow ups yet</p>
              )}
            </div>
          </div>

          {/* Complete Follow Up */}
          <div className="mt-6 rounded-xl bg-[#111111] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#D4AF37]">
                Complete Follow Up
              </h3>
              <span className="rounded-full bg-[#1d1d1d] px-3 py-1 text-xs text-zinc-400">
                Total: {lead.followUpCount || 0}
              </span>
            </div>

            <div className="space-y-4">
              <textarea
                rows={4}
                disabled={followUpDisabled}
                value={form.remarks}
                onChange={(e) => updateField("remarks", e.target.value)}
                placeholder="Write follow up remarks..."
                className="
    w-full
    rounded-lg
    bg-[#1d1d1d]
    p-3
    text-sm
    text-white
    outline-none
    disabled:cursor-not-allowed
    disabled:opacity-50
  "
              />

              <select
                value={lead.status}
                disabled={isClosed || saving}
                onChange={(e) => updateLeadStatus(e.target.value)}
                className="
  w-full
  rounded-lg
  bg-[#1d1d1d]
  p-3
  text-sm
  text-white
  outline-none
  disabled:opacity-50
  "
              >
                <option value="NEW">NEW</option>
                <option value="CALLED">CALLED</option>
                <option value="NEED_MORE_FOLLOW_UP">NEED MORE FOLLOW UP</option>
                <option value="TRAINING_ATTENDED">TRAINING ATTENDED</option>
                <option value="SEAT_RESERVED">SEAT RESERVED</option>
                <option value="JOINED">JOINED</option>
                <option value="DEAD">DEAD</option>
              </select>

              <button
                onClick={completeFollowUp}
                disabled={followUpDisabled}
                className={`w-full rounded-xl py-3 font-semibold transition ${
                  followUpDisabled
                    ? "cursor-not-allowed bg-zinc-700 text-zinc-400"
                    : "bg-[#D4AF37] text-black hover:opacity-90"
                }`}
              >
                {saving
                  ? "Saving..."
                  : maxFollowUpsReached
                    ? "Max Follow Ups Completed"
                    : isClosed
                      ? "Lead Closed"
                      : !nextFollowUpReached
                        ? "Waiting For Next Follow Up"
                        : "Complete Follow Up"}
              </button>
            </div>
          </div>

          {/* Status History */}
          <div className="mt-6 rounded-xl bg-[#111111] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#D4AF37]">
              <History size={16} />
              Status History
            </h3>
            <div className="space-y-3">
              {lead.statusHistory?.length > 0 ? (
                lead.statusHistory.map(
                  (item: {
                    id: string;
                    oldStatus: string;
                    newStatus: string;
                    changedBy?: { name: string };
                    changedAt: string;
                  }) => (
                    <div key={item.id} className="rounded-lg bg-[#1a1a1a] p-3">
                      <p className="text-sm text-white">
                        {item.oldStatus}
                        <span className="mx-2 text-[#D4AF37]">→</span>
                        {item.newStatus}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        By {item.changedBy?.name || "Unknown"} •{" "}
                        {new Date(item.changedAt).toLocaleString()}
                      </p>
                    </div>
                  ),
                )
              ) : (
                <p className="text-sm text-zinc-500">No status history</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
