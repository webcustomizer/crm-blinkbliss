"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeadFormData } from "@/types/lead";
import { LEAD_SOURCES } from "@/lib/constants/lead";

type LeadFormProps = {
  initialData?: Partial<LeadFormData>;
  loading?: boolean;
  onSubmit: (data: LeadFormData) => Promise<void>;
};

export default function LeadForm({ initialData, loading, onSubmit }: LeadFormProps) {
  const [form, setForm] = React.useState<LeadFormData>({
    name: initialData?.name ?? "",
    phone: initialData?.phone ?? "",
    email: initialData?.email ?? "",
    city: initialData?.city ?? "",
    age: initialData?.age ?? "",
    purpose: initialData?.purpose ?? "",
    currentStatus: initialData?.currentStatus ?? "",
    bestTimeToReach: initialData?.bestTimeToReach ?? "",
    willingToAttendTraining: initialData?.willingToAttendTraining ?? null,
    source: initialData?.source ?? undefined,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  const inputClass = "h-11 rounded-lg border border-white/10 bg-[#181818] px-3 text-white placeholder:text-gray-500 focus:border-[#D4AF37] focus:ring-[#D4AF37]/30";
  const selectClass = "h-11 w-full rounded-lg border border-white/10 bg-[#181818] px-3 text-white outline-none focus:border-[#D4AF37] focus:ring-[#D4AF37]/30";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h3 className="mb-5 text-xl font-semibold text-[#D4AF37]">Basic Information</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-gray-300">Full Name</Label>
            <Input name="name" value={form.name} onChange={handleChange} className={inputClass} placeholder="Enter full name" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Mobile / WhatsApp Number *</Label>
            <Input name="phone" value={form.phone} onChange={handleChange} className={inputClass} placeholder="03xxxxxxxxx" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Email</Label>
            <Input name="email" value={form.email} onChange={handleChange} className={inputClass} placeholder="Email address" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">City</Label>
            <Input name="city" value={form.city} onChange={handleChange} className={inputClass} placeholder="City" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Lead Source</Label>
            <select name="source" value={form.source || ""} onChange={handleChange} className={selectClass}>
              <option value="">Select Source</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-5 text-xl font-semibold text-[#D4AF37]">Lead Details</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-gray-300">Age</Label>
            <Input name="age" value={form.age} onChange={handleChange} className={inputClass} placeholder="Age" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Purpose</Label>
            <select name="purpose" value={form.purpose} onChange={handleChange} className={selectClass}>
              <option value="">Select Purpose</option>
              <option value="To earn extra income">To earn extra income</option>
              <option value="To learn new skills">To learn new skills</option>
              <option value="To start an online business">To start an online business</option>
              <option value="Looking for better career opportunities">Looking for better career opportunities</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Your Current Status</Label>
            <select name="currentStatus" value={form.currentStatus} onChange={handleChange} className={selectClass}>
              <option value="">Select Status</option>
              <option value="Job Holder">Job Holder</option>
              <option value="Unemployed">Unemployed</option>
              <option value="Housewife">Housewife</option>
              <option value="Student">Student</option>
              <option value="Business Owner">Business Owner</option>
              <option value="Freelancer">Freelancer</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Best Time To Reach</Label>
            <select name="bestTimeToReach" value={form.bestTimeToReach} onChange={handleChange} className={selectClass}>
              <option value="">Select Time</option>
              <option value="12:00 AM – 3:00 AM">12:00 AM – 3:00 AM</option>
              <option value="3:00 AM – 6:00 AM">3:00 AM – 6:00 AM</option>
              <option value="6:00 AM – 9:00 AM">6:00 AM – 9:00 AM</option>
              <option value="9:00 AM – 12:00 PM">9:00 AM – 12:00 PM</option>
              <option value="12:00 PM – 3:00 PM">12:00 PM – 3:00 PM</option>
              <option value="3:00 PM – 6:00 PM">3:00 PM – 6:00 PM</option>
              <option value="6:00 PM – 9:00 PM">6:00 PM – 9:00 PM</option>
              <option value="9:00 PM – 12:00 AM">9:00 PM – 12:00 AM</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <Label className="text-gray-300">Willing To Attend Training?</Label>
        <div className="mt-4 flex gap-8">
          <label className="flex cursor-pointer items-center gap-3 text-gray-300">
            <input type="radio" checked={form.willingToAttendTraining === true} onChange={() => setForm((prev) => ({ ...prev, willingToAttendTraining: true }))} className="accent-[#D4AF37]" /> Yes
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-gray-300">
            <input type="radio" checked={form.willingToAttendTraining === false} onChange={() => setForm((prev) => ({ ...prev, willingToAttendTraining: false }))} className="accent-[#D4AF37]" /> No
          </label>
        </div>
      </section>

      <div className="flex justify-end border-t border-white/10 pt-6">
        <Button type="submit" disabled={loading} className="h-11 rounded-lg bg-[#D4AF37] px-8 font-semibold text-black hover:bg-[#c79f27]">
          {loading ? "Saving..." : "Save Lead"}
        </Button>
      </div>
    </form>
  );
}
