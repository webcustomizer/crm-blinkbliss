"use client";

import { useState } from "react";
import { Mail, Phone, ShieldCheck, Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";

interface PersonalInformationCardProps {
  profile: {
    name: string;
    email: string;
    phone?: string | null;
    role: string;
    isActive: boolean;
  };
  onProfileUpdated?: (profile: { name: string; phone: string | null }) => void;
}

export default function PersonalInformationCard({
  profile,
  onProfileUpdated,
}: PersonalInformationCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone || "");

  async function handleSave() {
    if (name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/salesperson/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Profile updated");
        setEditing(false);
        onProfileUpdated?.({ name: data.profile.name, phone: data.profile.phone });
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setName(profile.name);
    setPhone(profile.phone || "");
    setEditing(false);
  }

  return (
    <div className="rounded-3xl border border-[#D4AF37]/20 bg-[#111111] p-6 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Personal Information</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/30 px-3 py-1.5 text-xs text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
          >
            <Edit3 size={14} /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1 rounded-xl border border-white/20 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 rounded-xl bg-[#D4AF37] px-3 py-1.5 text-xs font-medium text-black transition hover:bg-[#D4AF37]/90 disabled:opacity-50"
            >
              <Check size={14} /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Email — read-only */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
            <Mail size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Email Address</p>
            <p className="mt-1 break-all text-sm font-medium text-white">
              {profile.email}
            </p>
          </div>
        </div>

        {/* Name — editable */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">Full Name</p>
            {editing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#D4AF37]/30 bg-black/40 px-3 py-1.5 text-sm font-medium text-white outline-none focus:border-[#D4AF37]"
              />
            ) : (
              <p className="mt-1 text-sm font-medium text-white">{profile.name}</p>
            )}
          </div>
        </div>

        {/* Phone — editable */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
            <Phone size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">Phone Number</p>
            {editing ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Not provided"
                className="mt-1 w-full rounded-lg border border-[#D4AF37]/30 bg-black/40 px-3 py-1.5 text-sm font-medium text-white outline-none focus:border-[#D4AF37]"
              />
            ) : (
              <p className="mt-1 text-sm font-medium text-white">
                {profile.phone || "Not provided"}
              </p>
            )}
          </div>
        </div>

        {/* Role — always read-only */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Account Role</p>
            <p className="mt-1 text-sm font-medium text-white">Sales Executive</p>
          </div>
        </div>
      </div>
    </div>
  );
}
