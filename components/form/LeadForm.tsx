"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

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

interface LeadFormProps {
  loading: boolean;
  onSubmit: (data: LeadFormData) => Promise<boolean>;
}

export default function LeadForm({ loading, onSubmit }: LeadFormProps) {
  const [success, setSuccess] = useState(false);

  const [errors, setErrors] = useState<
    Partial<Record<keyof LeadFormData, string>>
  >({});

  const [form, setForm] = useState<LeadFormData>({
    name: "",
    phone: "",
    email: "",
    city: "",
    age: "",
    purpose: "",
    currentStatus: "",
    bestTimeToReach: "",
    willingToAttendTraining: null,
  });

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

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const newErrors: Partial<Record<keyof LeadFormData, string>> = {};

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
      return;
    }

    try {
      const ok = await onSubmit(form);
      if (ok) {
        setSuccess(true);
        setForm({
          name: "",
          phone: "",
          email: "",
          city: "",
          age: "",
          purpose: "",
          currentStatus: "",
          bestTimeToReach: "",
          willingToAttendTraining: null,
        });
      }
    } catch {
      alert("Failed to submit form.");
    }
  }

  const inputClass = `
w-full
h-12
rounded-xl
border
bg-[#181818]
px-4
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
text-white
outline-none
transition
`;
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-5">
        <div
          className="
        w-full
        max-w-lg
        rounded-3xl
        border
        border-[#D4AF37]/30
        bg-[#111111]
        p-10
        text-center
        shadow-2xl
        shadow-[#D4AF37]/10
        "
        >
          <div
            className="
          mx-auto
          mb-6
          flex
          h-24
          w-24
          items-center
          justify-center
          rounded-full
          bg-green-500/10
          text-5xl
          "
          >
            ✅
          </div>

          <h1 className="text-3xl font-bold text-[#D4AF37]">
            Application Submitted Successfully!
          </h1>

          <p className="mt-4 leading-7 text-gray-300">
            Thank you for your interest.
            <br />
            Our team has received your application and will contact you shortly
            via WhatsApp or phone.
          </p>

          <button
            onClick={() => {
              setSuccess(false);

              setForm({
                name: "",
                phone: "",
                email: "",
                city: "",
                age: "",
                purpose: "",
                currentStatus: "",
                bestTimeToReach: "",
                willingToAttendTraining: null,
              });

              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
            className="
          mt-8
          h-12
          w-full
          rounded-xl
          bg-[#D4AF37]
          font-bold
          text-black
          transition
          hover:bg-[#c89d1d]
          "
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-black py-10 px-4">
      <div className="mx-auto max-w-3xl">
        {/* HERO */}

        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#D4AF37]/10">
            <Sparkles className="h-10 w-10 text-[#D4AF37]" />
          </div>

          <h1 className="text-3xl font-bold text-white">
            Start Your Online Journey
          </h1>

          <p className="mt-3 text-gray-400">
            Fill in the form below and our team will contact you shortly.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-[#D4AF37]/20 bg-[#111111] p-6 md:p-10"
        >
          {/* BASIC */}

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
                  {errors.name && (
                    <div className="mt-1 text-xs">{errors.name}</div>
                  )}
                </label>

                <input
                  name="name"
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
                  {errors.city && (
                    <div className="mt-1 text-xs">{errors.city}</div>
                  )}
                </label>

                <input
                  name="city"
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

          {/* DETAILS */}

          <div className="mt-10">
            <h2 className="mb-6 text-xl font-bold text-[#D4AF37]">
              Your Details
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  className={`mb-2 block text-sm ${
                    errors.age ? "text-red-400" : "text-gray-300"
                  }`}
                >
                  Age *
                  {errors.age && (
                    <div className="mt-1 text-xs">{errors.age}</div>
                  )}
                </label>

                <input
                  name="age"
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

          {/* TRAINING */}

          <div className="mt-10">
            <h2 className="mb-5 text-xl font-bold text-[#D4AF37]">Training</h2>

            <label
              className={`mb-2 block text-sm ${
                errors.willingToAttendTraining
                  ? "text-red-400"
                  : "text-gray-300"
              }`}
            >
              Are you willing to attend a free training session? *
              {errors.willingToAttendTraining && (
                <div className="mt-1 text-xs">
                  {errors.willingToAttendTraining}
                </div>
              )}
            </label>

            <div className="flex gap-6">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-5 py-3 text-white hover:border-[#D4AF37]">
                <input
                  type="radio"
                  checked={form.willingToAttendTraining === true}
                  onChange={() => {
                    setForm((prev) => ({
                      ...prev,
                      willingToAttendTraining: true,
                    }));

                    setErrors((prev) => ({
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
                  checked={form.willingToAttendTraining === false}
                  onChange={() => {
                    setForm((prev) => ({
                      ...prev,
                      willingToAttendTraining: false,
                    }));

                    setErrors((prev) => ({
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

          {/* BUTTON */}

          <div className="mt-12">
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
      </div>
    </div>
  );
}
