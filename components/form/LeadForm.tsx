"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type LeadFormData = {
  name: string;
  phone: string;
  email: string;
  city: string;
  age: string;
  purpose: string;
  currentStatus: string;
  bestTimeToReach: string;
  willingToAttendTraining: boolean | null;
};

type FormErrors = Partial<Record<keyof LeadFormData, string>>;

// Accepts either the old boolean-only contract, or the richer
// success/message shape, so this component works with either
// parent implementation and can show a real error message
// whenever the parent provides one.
type SubmitResult = boolean | { success: boolean; message?: string };

interface LeadFormProps {
  loading: boolean;
  onSubmit: (data: LeadFormData) => Promise<SubmitResult>;
}

const initialFormState: LeadFormData = {
  name: "",
  phone: "",
  email: "",
  city: "",
  age: "",
  purpose: "",
  currentStatus: "",
  bestTimeToReach: "",
  willingToAttendTraining: null,
};

export default function LeadForm({ loading, onSubmit }: LeadFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<LeadFormData>(initialFormState);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "phone") {
      value = value.replace(/\D/g, "").slice(0, 11);
    }

    if (name === "age") {
      value = value.replace(/\D/g, "").slice(0, 3);
    }

    setForm((prev: LeadFormData) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev: FormErrors) => ({
      ...prev,
      [name]: "",
    }));

    setSubmitError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitError(null);

    const newErrors: FormErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^03\d{9}$/;
    const numberRegex = /^\d+$/;

    if (!form.name.trim()) {
      newErrors.name = "Please enter your full name";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Please enter your WhatsApp number";
    } else if (!phoneRegex.test(form.phone.trim())) {
      newErrors.phone = "Enter a valid number (03XXXXXXXXX)";
    }

    if (!form.email.trim()) {
      newErrors.email = "Please enter your email";
    } else if (!emailRegex.test(form.email.trim())) {
      newErrors.email = "Enter a valid email address";
    }

    if (!form.city.trim()) {
      newErrors.city = "Please enter your city";
    }

    if (!form.age.trim()) {
      newErrors.age = "Please enter your age";
    } else if (!numberRegex.test(form.age.trim())) {
      newErrors.age = "Age must contain numbers only";
    } else if (+form.age < 16 || +form.age > 100) {
      newErrors.age = "Age must be between 16 and 100";
    }

    if (!form.purpose) {
      newErrors.purpose = "Please select an option";
    }

    if (!form.currentStatus) {
      newErrors.currentStatus = "Please select an option";
    }

    if (!form.bestTimeToReach) {
      newErrors.bestTimeToReach = "Please select an option";
    }

    if (form.willingToAttendTraining === null) {
      newErrors.willingToAttendTraining = "Please select an option";
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);

      // Scroll/focus the first invalid field into view — crucial on
      // mobile where the user may be scrolled far from the top field.
      const fieldOrder: (keyof LeadFormData)[] = [
        "name",
        "phone",
        "email",
        "city",
        "age",
        "purpose",
        "currentStatus",
        "bestTimeToReach",
        "willingToAttendTraining",
      ];

      const firstErrorField = fieldOrder.find((field) => newErrors[field]);

      if (firstErrorField) {
        const el = document.getElementsByName(firstErrorField)[0];
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (el instanceof HTMLElement) {
          el.focus({ preventScroll: true });
        }
      }

      return;
    }

    try {
      const result = await onSubmit(form);

      const isSuccess = typeof result === "boolean" ? result : result.success;
      const message = typeof result === "boolean" ? undefined : result.message;

      if (isSuccess) {
        setForm(initialFormState);
      } else {
        setSubmitError(message || "Failed to submit form. Please try again.");
      }
    } catch {
      setSubmitError("Failed to submit form. Please try again.");
    }
  }

  const inputClass = `
w-full
h-12
rounded-xl
border
bg-[#181818]
px-4
text-base
text-white
placeholder:text-gray-500
outline-none
transition
`;

  const selectClass = `
w-full
h-12
rounded-xl
border
bg-[#181818]
px-4
text-base
text-white
outline-none
transition
`;

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-[#D4AF37]/20 bg-[#111111] p-6 md:p-10"
    >
      <div>
        <h2 className="mb-6 text-xl font-bold text-[#D4AF37]">
          Basic Information
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              className={`mb-2 block text-sm ${
                errors.name ? "text-red-400" : "text-gray-300"
              }`}
            >
              Full Name *
              {errors.name && <div className="mt-1 text-xs">{errors.name}</div>}
            </label>

            <input
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              className={`${inputClass} ${
                errors.name
                  ? "border-red-500 focus:border-red-500"
                  : "border-white/10 focus:border-[#D4AF37]"
              }`}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label
              className={`mb-2 block text-sm ${
                errors.phone ? "text-red-400" : "text-gray-300"
              }`}
            >
              WhatsApp Number *
              {errors.phone && (
                <div className="mt-1 text-xs">{errors.phone}</div>
              )}
            </label>

            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={form.phone}
              onChange={handleChange}
              className={`${inputClass} ${
                errors.phone
                  ? "border-red-500 focus:border-red-500"
                  : "border-white/10 focus:border-[#D4AF37]"
              }`}
              placeholder="03XXXXXXXXX"
            />
          </div>

          <div>
            <label
              className={`mb-2 block text-sm ${
                errors.email ? "text-red-400" : "text-gray-300"
              }`}
            >
              Email Address *
              {errors.email && (
                <div className="mt-1 text-xs">{errors.email}</div>
              )}
            </label>

            <input
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              className={`${inputClass} ${
                errors.email
                  ? "border-red-500 focus:border-red-500"
                  : "border-white/10 focus:border-[#D4AF37]"
              }`}
              placeholder="example@gmail.com"
            />
          </div>

          <div>
            <label
              className={`mb-2 block text-sm ${
                errors.city ? "text-red-400" : "text-gray-300"
              }`}
            >
              City *
              {errors.city && <div className="mt-1 text-xs">{errors.city}</div>}
            </label>

            <input
              name="city"
              autoComplete="address-level2"
              value={form.city}
              onChange={handleChange}
              className={`${inputClass} ${
                errors.city
                  ? "border-red-500 focus:border-red-500"
                  : "border-white/10 focus:border-[#D4AF37]"
              }`}
              placeholder="Your City"
            />
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-6 text-xl font-bold text-[#D4AF37]">Your Details</h2>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              className={`mb-2 block text-sm ${
                errors.age ? "text-red-400" : "text-gray-300"
              }`}
            >
              Age *
              {errors.age && <div className="mt-1 text-xs">{errors.age}</div>}
            </label>

            <input
              name="age"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.age}
              onChange={handleChange}
              className={`${inputClass} ${
                errors.age
                  ? "border-red-500 focus:border-red-500"
                  : "border-white/10 focus:border-[#D4AF37]"
              }`}
              placeholder="Your Age"
            />
          </div>

          <div>
            <label
              className={`mb-2 block text-sm ${
                errors.purpose ? "text-red-400" : "text-gray-300"
              }`}
            >
              Purpose *
              {errors.purpose && (
                <div className="mt-1 text-xs">{errors.purpose}</div>
              )}
            </label>

            <select
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              className={`${selectClass} ${
                errors.purpose
                  ? "border-red-500 focus:border-red-500"
                  : "border-white/10 focus:border-[#D4AF37]"
              }`}
            >
              <option value="">Select Purpose</option>
              <option>To earn extra income</option>
              <option>To learn new skills</option>
              <option>To start an online business</option>
              <option>Looking for better career opportunities</option>
            </select>
          </div>

          <div>
            <label
              className={`mb-2 block text-sm ${
                errors.currentStatus ? "text-red-400" : "text-gray-300"
              }`}
            >
              Current Status *
              {errors.currentStatus && (
                <div className="mt-1 text-xs">{errors.currentStatus}</div>
              )}
            </label>

            <select
              name="currentStatus"
              value={form.currentStatus}
              onChange={handleChange}
              className={`${selectClass} ${
                errors.currentStatus
                  ? "border-red-500 focus:border-red-500"
                  : "border-white/10 focus:border-[#D4AF37]"
              }`}
            >
              <option value="">Select Status</option>
              <option value="Student">Student</option>
              <option value="Job Holder">Job Holder</option>
              <option value="Business Owner">Business Owner</option>
              <option value="Housewife">Housewife</option>
              <option value="Freelancer">Freelancer</option>
              <option value="Unemployed">Unemployed</option>
            </select>
          </div>

          <div>
            <label
              className={`mb-2 block text-sm ${
                errors.bestTimeToReach ? "text-red-400" : "text-gray-300"
              }`}
            >
              Best Time To Reach *
              {errors.bestTimeToReach && (
                <div className="mt-1 text-xs">{errors.bestTimeToReach}</div>
              )}
            </label>

            <select
              name="bestTimeToReach"
              value={form.bestTimeToReach}
              onChange={handleChange}
              className={`${selectClass} ${
                errors.bestTimeToReach
                  ? "border-red-500 focus:border-red-500"
                  : "border-white/10 focus:border-[#D4AF37]"
              }`}
            >
              <option value="">Select Time</option>
              <option>9:00 AM - 12:00 PM</option>
              <option>12:00 PM - 3:00 PM</option>
              <option>3:00 PM - 6:00 PM</option>
              <option>6:00 PM - 9:00 PM</option>
              <option>9:00 PM - 11:00 PM</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-5 text-xl font-bold text-[#D4AF37]">Training</h2>

        <label
          className={`mb-2 block text-sm ${
            errors.willingToAttendTraining ? "text-red-400" : "text-gray-300"
          }`}
        >
          Are you willing to attend a free training session? *
          {errors.willingToAttendTraining && (
            <div className="mt-1 text-xs">{errors.willingToAttendTraining}</div>
          )}
        </label>

        <div className="flex gap-6">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-5 py-3 text-white hover:border-[#D4AF37]">
            <input
              type="radio"
              name="willingToAttendTraining"
              checked={form.willingToAttendTraining === true}
              onChange={() => {
                setForm((prev: LeadFormData) => ({
                  ...prev,
                  willingToAttendTraining: true,
                }));

                setErrors((prev: FormErrors) => ({
                  ...prev,
                  willingToAttendTraining: "",
                }));
              }}
              className="accent-[#D4AF37]"
            />
            Yes
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-5 py-3 text-white hover:border-[#D4AF37]">
            <input
              type="radio"
              name="willingToAttendTraining"
              checked={form.willingToAttendTraining === false}
              onChange={() => {
                setForm((prev: LeadFormData) => ({
                  ...prev,
                  willingToAttendTraining: false,
                }));

                setErrors((prev: FormErrors) => ({
                  ...prev,
                  willingToAttendTraining: "",
                }));
              }}
              className="accent-[#D4AF37]"
            />
            No
          </label>
        </div>
      </div>

      {/* Sticky submit bar on mobile: stays reachable without
          forcing the user to scroll all the way down through a
          long form. Falls back to normal static position on
          desktop (md and up). */}
      <div className="sticky bottom-0 z-10 -mx-6 mt-12 bg-[#111111]/95 px-6 pb-6 pt-4 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:pb-0 md:backdrop-blur-none">
        {submitError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {submitError}
          </div>
        )}
        <button
          disabled={loading}
          type="submit"
          className="
              flex
              h-14
              w-full
              items-center
              justify-center
              rounded-2xl
              bg-[#D4AF37]
              text-lg
              font-bold
              text-black
              transition
              hover:scale-[1.02]
              hover:bg-[#c89d1d]
              disabled:opacity-60
              "
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </button>
      </div>
    </form>
  );
}
