"use client";

import { useCallback, useEffect, useState, memo } from "react";
import { createPortal } from "react-dom";

import {
  X,
  Phone,
  MapPin,
  CalendarClock,
  History,
  Edit3,
  AlertCircle,
} from "lucide-react";

import LeadStatusBadge from "./LeadStatusBadge";
import { toast } from "sonner";
import {
  getLeadCached,
  invalidateLead,
  getLeadFromCacheSync,
} from "@/lib/leadCache";

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

// Simple inline WhatsApp glyph (lucide-react has no official WhatsApp icon)
function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.5 0 .18 5.32.18 11.88c0 2.09.55 4.13 1.6 5.93L0 24l6.35-1.66a11.86 11.86 0 0 0 5.7 1.45h.01c6.56 0 11.88-5.32 11.88-11.88 0-3.17-1.24-6.15-3.42-8.43ZM12.06 21.6a9.7 9.7 0 0 1-4.95-1.36l-.35-.21-3.77.99 1-3.67-.23-.38a9.72 9.72 0 0 1-1.49-5.09c0-5.38 4.38-9.76 9.8-9.76a9.7 9.7 0 0 1 6.9 2.87 9.7 9.7 0 0 1 2.87 6.9c0 5.39-4.38 9.71-9.78 9.71Zm5.36-7.29c-.29-.15-1.73-.86-2-.95-.27-.1-.46-.15-.66.14-.2.29-.76.95-.93 1.15-.17.19-.34.22-.63.07-.29-.15-1.23-.45-2.34-1.44-.87-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.5.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.15-.66-1.58-.9-2.17-.24-.57-.48-.49-.66-.5h-.56c-.19 0-.5.07-.76.36-.26.29-1 1-1 2.42 0 1.43 1.02 2.81 1.17 3 .15.19 2 3.05 4.85 4.28.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.73-.71 1.98-1.39.24-.68.24-1.27.17-1.39-.07-.12-.26-.19-.55-.34Z" />
    </svg>
  );
}

// Attempts to open WhatsApp for this number; if the app/web WhatsApp
// doesn't actually open within a short window, falls back to a normal
// phone call. There's no public way to confirm WhatsApp registration
// ahead of time, so this is a best-effort heuristic, not a guarantee.
function smartCall(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  const waUrl = `https://wa.me/${cleaned}`;
  const telUrl = `tel:${phone}`;

  let appOpened = false;
  const markOpened = () => {
    appOpened = true;
  };

  window.addEventListener("blur", markOpened, { once: true });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) markOpened();
    },
    { once: true },
  );

  window.location.href = waUrl;

  window.setTimeout(() => {
    window.removeEventListener("blur", markOpened);
    if (!appOpened) {
      window.location.href = telUrl;
    }
  }, 1200);
}

// small helper purely for visual section headers — no state, no logic
function SectionTitle({
  icon,
  title,
  trailing,
}: {
  icon?: React.ReactNode;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#D4AF37]">
        {icon}
        {title}
      </h3>
      {trailing}
    </div>
  );
}

// Skeleton block — mimics the shape of a loaded section so the panel
// never has to jump-cut between "empty" and "full" layouts.
function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03] ${className}`}
    />
  );
}

const LeadField = memo(function LeadField({
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
      border-white/[0.06]
      bg-gradient-to-br
      from-[#181818]
      to-[#111111]
      p-4
      transition-colors
      duration-150
      active:border-[#D4AF37]/25
      sm:hover:border-[#D4AF37]/25
      "
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
          {label}
        </p>

        {!disabled && !value && (
          <button
            onClick={() => toggleEdit(field)}
            className="
            min-h-[32px]
            rounded-full
            border
            border-[#D4AF37]/20
            bg-[#D4AF37]/10
            px-3
            py-1
            text-xs
            font-medium
            text-[#D4AF37]
            transition
            duration-150
            active:bg-[#D4AF37]
            active:text-black
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
          border-[#D4AF37]/25
          bg-black/40
          px-4
          py-3
          text-sm
          text-white
          outline-none
          transition
          duration-150
          focus:border-[#D4AF37]
          "
        />
      ) : (
        <p className="mt-2 text-sm font-medium text-white">
          {value || <span className="text-white/25">Not added</span>}
        </p>
      )}
    </div>
  );
});

interface FollowupItem {
  id: string;
  remarks: string;
  followUpNumber: number; // 0 = plain note, 1+ = real follow up
  createdAt: string;
  user?: { id: string; name: string };
}

// Builds the edit-form shape from a raw lead record. Pulled out so both
// the initial (possibly cache-warm) mount and every subsequent refetch
// populate the form identically.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFormFromLead(leadData: any, prevRemarks: string) {
  return {
    name: leadData.name || "",
    email: leadData.email || "",
    city: leadData.city || "",
    age: leadData.age?.toString() || "",
    purpose: leadData.purpose || "",
    currentStatus: leadData.currentStatus || "",
    bestTimeToReach: leadData.bestTimeToReach || "",
    willingToAttendTraining: leadData.willingToAttendTraining ? "YES" : "NO",
    remarks: prevRemarks,
    status: leadData.status,
  };
}

const EMPTY_FORM = {
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
};

export default function LeadDetails({ leadId, onClose }: LeadDetailsProps) {
  // Synchronous cache check, run once per mount. If LeadsTable's
  // onPointerDown prefetch already resolved, this is populated
  // immediately — no skeleton flash, no waiting on a promise.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cachedOnMount = getLeadFromCacheSync(leadId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lead, setLead] = useState<any | null>(cachedOnMount?.lead ?? null);
  const [loading, setLoading] = useState(() => !cachedOnMount?.lead);
  const [saving, setSaving] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  // Separate flag just for the status dropdown, so we can show a
  // dedicated loading overlay on it without touching the shared
  // `saving` flag other buttons already rely on.
  const [statusSaving, setStatusSaving] = useState(false);
  // Same idea, but for the "Save Lead Information" action.
  const [infoSaving, setInfoSaving] = useState(false);
  // Same idea, but for completing a follow up.
  const [followUpSaving, setFollowUpSaving] = useState(false);

  const [showAllFollowups, setShowAllFollowups] = useState(false);
  const [showAllStatusHistory, setShowAllStatusHistory] = useState(false);

  // Portal target only exists in the browser — mount flag avoids
  // touching `document` during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isClosed = lead?.status === "JOINED" || lead?.status === "DEAD";

  const maxFollowUpsReached = (lead?.followUpCount || 0) >= 4;

  const nextFollowUpReached = (() => {
    if (!lead?.nextFollowUp) return true;

    // Compare calendar dates in PKT, not exact timestamps.
    // A follow-up is "due" the whole day it's scheduled for —
    // not only after the exact stored time (e.g. 12:00 PM) has passed.
    const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

    const followUpPKT = new Date(
      new Date(lead.nextFollowUp).getTime() + PKT_OFFSET_MS,
    );
    const nowPKT = new Date(Date.now() + PKT_OFFSET_MS);

    const followUpDateStr = followUpPKT.toISOString().split("T")[0];
    const nowDateStr = nowPKT.toISOString().split("T")[0];

    return followUpDateStr <= nowDateStr;
  })();

  const [form, setForm] = useState(() =>
    cachedOnMount?.lead
      ? buildFormFromLead(cachedOnMount.lead, "")
      : EMPTY_FORM,
  );

  // Remarks textarea only blocked by saving/closed state —
  // salesperson can jot notes anytime, not tied to follow-up eligibility
  const remarksDisabled = saving || noteSaving || isClosed;

  // Remarks are mandatory specifically to complete a follow up
  const remarksMissing = !form.remarks.trim();

  const followUpDisabled =
    saving ||
    isClosed ||
    maxFollowUpsReached ||
    !nextFollowUpReached ||
    remarksMissing;

  const [editingFields, setEditingFields] = useState<string[]>([]);

  // Whether there are unsaved Lead Information edits in progress —
  // drives which action the mobile sticky bar surfaces.
  const hasUnsavedLeadInfo = editingFields.length > 0;

  const updateField = useCallback((name: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const toggleEdit = useCallback((field: string) => {
    setEditingFields((prev) =>
      prev.includes(field)
        ? prev.filter((item) => item !== field)
        : [...prev, field],
    );
  }, []);

  // Reads through the shared cache — if LeadsTable already prefetched
  // this lead on pointerdown, this resolves instantly (or almost
  // instantly if the request is still in flight) instead of starting
  // a fresh fetch from scratch.
  const getLeadDetails = useCallback(async () => {
    try {
      const data = await getLeadCached(leadId);

      if (data?.lead) {
        const leadData = data.lead;
        setLead(leadData);
        setForm((prev) => buildFormFromLead(leadData, prev.remarks));
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  }, [leadId]);

  async function updateLeadStatus(newStatus: string) {
    try {
      setSaving(true);
      setStatusSaving(true);

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

      invalidateLead(leadId); // status changed server-side — old cache entry is stale
      await getLeadDetails();

      toast.success("Status updated successfully");
    } catch (error) {

      toast.error("Something went wrong");
    } finally {
      setSaving(false);
      setStatusSaving(false);
    }
  }

  // Fast path: saves a permanent note straight to the DB (followUpNumber = 0),
  // and merges the server's real record into local state — no full refetch,
  // so this stays snappy on mobile even with a slow connection.
  async function saveRemarksOnly() {
    const remarksText = form.remarks.trim();

    if (!remarksText) {
      toast.error("Please write something before saving");
      return;
    }

    try {
      setNoteSaving(true);

      const res = await fetch(`/api/salesperson/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ remarks: remarksText, isNote: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to save note");
        return;
      }

      // Real, permanent DB record — survives refresh, shows in history forever
      setLead((prev: any) => ({
        ...prev,
        followups: [data.note, ...(prev?.followups || [])],
      }));

      // We updated local state directly instead of refetching, so the
      // cached copy of this lead is now behind reality — drop it so the
      // next open (or any prefetch) doesn't hand back the old followups.
      invalidateLead(leadId);

      setForm((prev) => ({ ...prev, remarks: "" }));

      toast.success("Note saved successfully");
    } catch (error) {

      toast.error("Something went wrong");
    } finally {
      setNoteSaving(false);
    }
  }

  async function completeFollowUp() {
    if (!form.remarks.trim()) {
      toast.error("Please add remarks before completing the follow up");
      return;
    }

    try {
      setSaving(true);
      setFollowUpSaving(true);

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

      invalidateLead(leadId); // follow-up count / history changed server-side
      await getLeadDetails();

      setForm((prev) => ({ ...prev, remarks: "" }));

      toast.success("Follow up completed successfully");
    } catch (error) {

      toast.error("Something went wrong");
    } finally {
      setSaving(false);
      setFollowUpSaving(false);
    }
  }

  async function saveLeadInformation() {
    try {
      setSaving(true);
      setInfoSaving(true);

      const res = await fetch(`/api/salesperson/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message);
        return;
      }

      setEditingFields([]);

      invalidateLead(leadId); // field values changed server-side
      await getLeadDetails();

      toast.success("Lead information updated successfully.");
    } catch (error) {

      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
      setInfoSaving(false);
    }
  }

  useEffect(() => {
    async function loadLeadDetails() {
      await getLeadDetails();
    }

    loadLeadDetails();
  }, [leadId, getLeadDetails]);

  if (!mounted) {
    return null;
  }

  const notFound = !loading && !lead;

  const followups: FollowupItem[] = lead?.followups || [];
  const visibleFollowups = showAllFollowups ? followups : followups.slice(0, 3);

  const statusHistory = lead?.statusHistory || [];
  const visibleStatusHistory = showAllStatusHistory
    ? statusHistory
    : statusHistory.slice(0, 3);

  const followUpButtonLabel = saving
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
  // One sliding panel, mounted once on open. Loading / not-found / loaded
  // states only swap what renders *inside* it, so the slide-from-right
  // motion always happens exactly once, immediately on open — never a
  // jump-cut between a centered modal and a separate sliding panel.

  return createPortal(
    <div data-no-ptr className="fixed inset-0 z-50 flex h-[100dvh]">
      <div
        onClick={onClose}
        className="flex-1 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
      />

      {/* Sidebar */}
      <div
        className="
  relative
  flex
  h-full
  w-full
  max-w-2xl
  flex-col
  border-l
  border-white/10
  bg-[#080808]
  shadow-[0_0_60px_rgba(212,175,55,0.10)]
  animate-in
  slide-in-from-right
  duration-300
  ease-out
  fill-mode-both
  "
      >
        {statusSaving && (
          <div
            className="
            absolute
            inset-0
            z-40
            flex
            items-center
            justify-center
            bg-black/50
            backdrop-blur-[2px]
            "
          >
            <div
              className="
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-[#D4AF37]/25
              bg-[#111]/95
              px-6
              py-4
              shadow-xl
              "
            >
              <span
                className="
                h-5
                w-5
                animate-spin
                rounded-full
                border-2
                border-[#D4AF37]/25
                border-t-[#D4AF37]
                "
              />
              <span className="text-sm font-medium text-[#D4AF37]">
                Updating status…
              </span>
            </div>
          </div>
        )}

        {/* Sticky header */}
        <div
          className="
          sticky
          top-0
          z-10
          flex
          shrink-0
          items-center
          justify-between
          border-b
          border-white/10
          bg-[#080808]
          px-6
          py-4
          sm:bg-[#080808]/90
          sm:px-8
          sm:backdrop-blur-md
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
        flex
        h-11
        w-11
        shrink-0
        items-center
        justify-center
        rounded-2xl
        border
        border-[#D4AF37]/20
        bg-[#D4AF37]/[0.08]
        text-[#D4AF37]
        "
            >
              <History size={20} strokeWidth={1.75} />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Lead Details
              </h2>

              <p className="mt-0.5 text-xs text-white/35 sm:text-sm">
                Manage lead information and follow ups
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="
    min-h-[44px]
    min-w-[44px]
    rounded-2xl
    border
    border-white/10
    bg-white/5
    p-2.5
    text-white/50
    transition
    duration-150
    active:scale-95
    active:border-[#D4AF37]/40
    active:text-[#D4AF37]
    "
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content — min-h-0 is critical here so this
            flex item shrinks instead of expanding past the parent,
            which was pushing the bottom action bar off-screen on mobile */}
        <div
          className="
          min-h-0
          flex-1
          overflow-y-auto
          overscroll-contain
          [-webkit-overflow-scrolling:touch]
          "
        >
          <div className="p-4 pb-6 sm:p-6">
            {loading ? (
              // Skeleton — same rhythm/spacing as the real layout below,
              // so nothing reflows once the data arrives.
              <div className="space-y-5">
                <SkeletonBlock className="h-44" />
                <SkeletonBlock className="h-72" />
                <SkeletonBlock className="h-40" />
              </div>
            ) : notFound ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.08] text-[#D4AF37]">
                  <AlertCircle size={22} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Lead not found
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    It may have been reassigned or no longer exists.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Basic Information */}
                <div
                  className="
relative
overflow-hidden
rounded-3xl
border
border-[#D4AF37]/15
bg-gradient-to-br
from-[#171717]
to-[#0d0d0d]
p-6
shadow-xl
"
                >
                  {/* ambient glow, purely decorative */}
                  <div
                    aria-hidden
                    className="
                    pointer-events-none
                    absolute
                    -right-16
                    -top-16
                    h-48
                    w-48
                    rounded-full
                    bg-[#D4AF37]/10
                    blur-[80px]
                    "
                  />

                  <div className="relative flex items-start justify-between gap-4">
                    {/* Left Content */}
                    <div className="min-w-0 flex-1">
                      <h3
                        className="
text-2xl
font-bold
tracking-tight
text-white
break-words
"
                      >
                        {lead.name || "Unknown Lead"}
                      </h3>

                      <div className="mt-5 space-y-3.5 text-sm text-white/50">
                        {/* Phone */}
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/40">
                            <Phone size={15} />
                          </span>

                          <span className="min-w-0 break-all text-sm text-white/70">
                            {lead.phone}
                          </span>
                        </div>

                        {/* City */}
                        <p className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/40">
                            <MapPin size={15} />
                          </span>

                          <span className="break-words">
                            {lead.city || "-"}
                          </span>
                        </p>

                        {/* Follow Up */}
                        <p className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/40">
                            <CalendarClock size={15} />
                          </span>

                          <span className="break-words">
                            {lead.nextFollowUp
                              ? new Date(lead.nextFollowUp).toLocaleString()
                              : "No Follow Up"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex shrink-0 flex-col items-end gap-3">
                      {/* Status */}
                      <div className="mb-4 flex justify-center">
                        <LeadStatusBadge status={lead.status} />
                      </div>

                      {/* WhatsApp */}
                      {lead.phone && (
                        <button
                          onClick={() => smartCall(lead.phone)}
                          className="
inline-flex
items-center
gap-1.5
rounded-full
border
border-[#25D366]/25
bg-[#25D366]/10
px-3
py-1.5
text-[10px]
font-semibold
uppercase
tracking-wider
text-[#25D366]
transition-all
hover:bg-[#25D366]/20
"
                        >
                          <WhatsAppIcon size={11} />
                          Call
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lead Information */}
                <div className="relative mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  {infoSaving && (
                    <div
                      className="
                      absolute
                      inset-0
                      z-10
                      flex
                      items-center
                      justify-center
                      gap-3
                      rounded-2xl
                      bg-black/70
                      backdrop-blur-sm
                      "
                    >
                      <span
                        className="
                        h-5
                        w-5
                        animate-spin
                        rounded-full
                        border-2
                        border-[#D4AF37]/25
                        border-t-[#D4AF37]
                        "
                      />
                      <span className="text-sm font-medium text-[#D4AF37]">
                        Saving lead information…
                      </span>
                    </div>
                  )}

                  <SectionTitle
                    icon={<Edit3 size={15} strokeWidth={1.75} />}
                    title="Lead Information"
                  />

                  <div className="space-y-3">
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

                    {/* Desktop / inline save — hidden on mobile, sticky bar
                        (below) takes over saving there while editing */}
                    {editingFields.length > 0 && (
                      <button
                        onClick={saveLeadInformation}
                        disabled={saving}
                        className="mt-5 hidden min-h-[48px] w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:block"
                      >
                        {saving ? "Saving..." : "Save Lead Information"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Follow Up History */}
                <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <SectionTitle
                    icon={<History size={15} strokeWidth={1.75} />}
                    title="Follow Up History"
                  />
                  <div className="space-y-2.5">
                    {followups.length > 0 ? (
                      <>
                        {visibleFollowups.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-white/[0.05] bg-black/25 p-3.5 transition-colors hover:border-[#D4AF37]/20"
                          >
                            <p className="text-sm text-white/85">
                              {item.remarks}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-white/30">
                              <span>
                                {item.followUpNumber === 0
                                  ? "Note"
                                  : `Follow Up #${item.followUpNumber}`}
                                {item.user?.name ? ` • ${item.user.name}` : ""}
                              </span>
                              <span>
                                {new Date(item.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}

                        {followups.length > 3 && (
                          <button
                            onClick={() => setShowAllFollowups((prev) => !prev)}
                            className="min-h-[40px] w-full rounded-lg border border-white/10 text-xs font-medium text-white/40 transition duration-150 active:border-[#D4AF37]/30 active:text-[#D4AF37]"
                          >
                            {showAllFollowups
                              ? "Show Less"
                              : `Show ${followups.length - 3} More`}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-white/30">No follow ups yet</p>
                    )}
                  </div>
                </div>

                {/* Complete Follow Up */}
                <div className="relative mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  {followUpSaving && (
                    <div
                      className="
                      absolute
                      inset-0
                      z-10
                      flex
                      items-center
                      justify-center
                      gap-3
                      rounded-2xl
                      bg-black/70
                      backdrop-blur-sm
                      "
                    >
                      <span
                        className="
                        h-5
                        w-5
                        animate-spin
                        rounded-full
                        border-2
                        border-[#D4AF37]/25
                        border-t-[#D4AF37]
                        "
                      />
                      <span className="text-sm font-medium text-[#D4AF37]">
                        Completing follow up…
                      </span>
                    </div>
                  )}

                  <SectionTitle
                    title="Complete Follow Up"
                    trailing={
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/40">
                        Total: {lead.followUpCount || 0}
                      </span>
                    }
                  />

                  <div className="space-y-4">
                    <div className="relative">
                      {noteSaving && (
                        <div
                          className="
                          absolute
                          inset-0
                          z-10
                          flex
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          bg-black/70
                          backdrop-blur-sm
                          "
                        >
                          <span
                            className="
                            h-4
                            w-4
                            animate-spin
                            rounded-full
                            border-2
                            border-[#D4AF37]/25
                            border-t-[#D4AF37]
                            "
                          />
                          <span className="text-xs font-medium text-[#D4AF37]">
                            Saving note…
                          </span>
                        </div>
                      )}

                      <textarea
                        rows={4}
                        disabled={remarksDisabled}
                        value={form.remarks}
                        onChange={(e) => updateField("remarks", e.target.value)}
                        placeholder="Write remarks or notes..."
                        className="
    w-full
    rounded-xl
    border
    border-white/[0.06]
    bg-black/25
    p-3
    text-sm
    text-white
    outline-none
    transition
    duration-150
    placeholder:text-white/25
    focus:border-[#D4AF37]/40
    disabled:cursor-not-allowed
    disabled:opacity-50
  "
                      />

                      <div className="mt-2 flex items-center justify-between gap-3">
                        {remarksMissing && !remarksDisabled ? (
                          <p className="text-xs text-white/30">
                            Required to complete a follow up
                          </p>
                        ) : (
                          <span />
                        )}

                        <button
                          onClick={saveRemarksOnly}
                          disabled={remarksDisabled || remarksMissing}
                          className="
                      min-h-[40px]
                      shrink-0
                      rounded-lg
                      border
                      border-[#D4AF37]/30
                      px-4
                      py-2
                      text-xs
                      font-semibold
                      text-[#D4AF37]
                      transition
                      duration-150
                      active:scale-[0.97]
                      active:bg-[#D4AF37]/10
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                      "
                        >
                          {noteSaving ? "Saving..." : "Save Note"}
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <select
                        value={lead.status}
                        disabled={isClosed || saving}
                        onChange={(e) => updateLeadStatus(e.target.value)}
                        className="
  min-h-[48px]
  w-full
  rounded-xl
  border
  border-white/[0.06]
  bg-black/25
  p-3
  text-sm
  text-white
  outline-none
  transition
  duration-150
  focus:border-[#D4AF37]/40
  disabled:opacity-50
  "
                      >
                        <option value="NEW">NEW</option>
                        <option value="CALLED">CALLED</option>
                        <option value="SEAT_RESERVED">SEAT RESERVED</option>
                        <option value="TRAINING_ATTENDED">
                          TRAINING ATTENDED
                        </option>
                        <option value="NEED_MORE_FOLLOW_UP">
                          NEED MORE FOLLOW UP
                        </option>
                        <option value="JOINED">JOINED</option>
                        <option value="DEAD">DEAD</option>
                      </select>

                      {statusSaving && (
                        <div
                          className="
                          absolute
                          inset-0
                          z-10
                          flex
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-[#D4AF37]/20
                          bg-black/70
                          backdrop-blur-sm
                          "
                        >
                          <span
                            className="
                            h-4
                            w-4
                            animate-spin
                            rounded-full
                            border-2
                            border-[#D4AF37]/25
                            border-t-[#D4AF37]
                            "
                          />
                          <span className="text-xs font-medium text-[#D4AF37]">
                            Updating status…
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Desktop / inline button — hidden on mobile, sticky bar takes over there */}
                    <button
                      onClick={completeFollowUp}
                      disabled={followUpDisabled}
                      className={`hidden min-h-[48px] w-full rounded-xl py-3 font-semibold transition duration-150 active:scale-[0.98] md:block ${
                        followUpDisabled
                          ? "cursor-not-allowed bg-white/10 text-white/30"
                          : "bg-[#D4AF37] text-black active:opacity-90"
                      }`}
                    >
                      {followUpButtonLabel}
                    </button>
                  </div>
                </div>

                {/* Status History */}
                <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <SectionTitle
                    icon={<History size={15} strokeWidth={1.75} />}
                    title="Status History"
                  />
                  <div className="space-y-2.5">
                    {statusHistory.length > 0 ? (
                      <>
                        {visibleStatusHistory.map(
                          (item: {
                            id: string;
                            oldStatus: string;
                            newStatus: string;
                            changedBy?: { name: string };
                            changedAt: string;
                          }) => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-white/[0.05] bg-black/25 p-3.5 transition-colors hover:border-[#D4AF37]/20"
                            >
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white">
                                <span className="break-words text-white/60">
                                  {item.oldStatus}
                                </span>
                                <span className="shrink-0 text-[#D4AF37]">
                                  →
                                </span>
                                <span className="break-words">
                                  {item.newStatus}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-white/30">
                                By {item.changedBy?.name || "Unknown"} •{" "}
                                {new Date(item.changedAt).toLocaleString()}
                              </p>
                            </div>
                          ),
                        )}

                        {statusHistory.length > 3 && (
                          <button
                            onClick={() =>
                              setShowAllStatusHistory((prev) => !prev)
                            }
                            className="min-h-[40px] w-full rounded-lg border border-white/10 text-xs font-medium text-white/40 transition duration-150 active:border-[#D4AF37]/30 active:text-[#D4AF37]"
                          >
                            {showAllStatusHistory
                              ? "Show Less"
                              : `Show ${statusHistory.length - 3} More`}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-white/30">No status history</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sticky bottom action bar — mobile only, thumb-reachable.
            pb uses env(safe-area-inset-bottom) so it never hides
            behind the iOS home indicator / Android nav bar. Only
            shown once a lead is actually loaded.

            Context-aware: while the salesperson has unsaved Lead
            Information edits open (Add/Edit on name, email, etc.),
            this swaps to "Save Lead Information" so they don't lose
            track of it on a small screen — then swaps back to
            "Complete Follow Up" once there's nothing left to save. */}
        {!loading && lead && (
          <div
            className="
          shrink-0
          border-t
          border-white/10
          bg-[#080808]/95
          p-4
          pb-[calc(1rem+env(safe-area-inset-bottom))]
          backdrop-blur-md
          md:hidden
          "
          >
            {hasUnsavedLeadInfo ? (
              <button
                onClick={saveLeadInformation}
                disabled={saving}
                className={`min-h-[48px] w-full rounded-xl py-3 font-semibold transition duration-150 active:scale-[0.98] ${
                  saving
                    ? "cursor-not-allowed bg-white/10 text-white/30"
                    : "bg-[#D4AF37] text-black active:opacity-90"
                }`}
              >
                {infoSaving ? "Saving..." : "Save Lead Information"}
              </button>
            ) : (
              <button
                onClick={completeFollowUp}
                disabled={followUpDisabled}
                className={`min-h-[48px] w-full rounded-xl py-3 font-semibold transition duration-150 active:scale-[0.98] ${
                  followUpDisabled
                    ? "cursor-not-allowed bg-white/10 text-white/30"
                    : "bg-[#D4AF37] text-black active:opacity-90"
                }`}
              >
                {followUpButtonLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
