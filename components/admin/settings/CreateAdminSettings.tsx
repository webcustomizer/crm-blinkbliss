"use client";

import { useState } from "react";

export default function CreateAdminSettings() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Admin account create fail");
      }

      setMessage({
        type: "success",
        text: "Admin account successfully created",
      });
      setForm({ name: "", email: "", password: "", phone: "" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Kuch masla ho gaya" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-[#111111] p-6">
      <h2 className="text-xl font-semibold text-[#D4AF37]">Create New Admin</h2>
      <p className="mt-1 text-sm text-gray-400">
        Create new admin account this will be automatically new admin role
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div>
          <label className="mb-1 block text-sm text-gray-300">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">
            Phone (optional)
          </label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-white focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#D4AF37] px-5 py-2 font-medium text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Admin Account"}
          </button>
        </div>
      </form>

      {message && (
        <p
          className={`mt-4 text-sm ${
            message.type === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
