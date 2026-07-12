"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);

  const [showNew, setShowNew] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/salesperson/profile/password", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Password update failed");
      }

      toast.success("Password updated successfully");

      setCurrentPassword("");

      setNewPassword("");

      setConfirmPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
      rounded-3xl
      border
      border-[#D4AF37]/20
      bg-[#111111]
      p-6
      shadow-xl
      "
    >
      <div
        className="
        mb-6
        flex
        items-center
        gap-3
        "
      >
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
          <ShieldCheck size={22} />
        </div>

        <div>
          <h2
            className="
            text-lg
            font-semibold
            text-white
            "
          >
            Change Password
          </h2>

          <p
            className="
            text-sm
            text-gray-400
            "
          >
            Update your account security
          </p>
        </div>
      </div>

      <div
        className="
        space-y-4
        "
      >
        {/* CURRENT PASSWORD */}

        <PasswordInput
          label="Current Password"
          value={currentPassword}
          setValue={setCurrentPassword}
          show={showCurrent}
          setShow={setShowCurrent}
        />

        {/* NEW PASSWORD */}

        <PasswordInput
          label="New Password"
          value={newPassword}
          setValue={setNewPassword}
          show={showNew}
          setShow={setShowNew}
        />

        {/* CONFIRM PASSWORD */}

        <PasswordInput
          label="Confirm New Password"
          value={confirmPassword}
          setValue={setConfirmPassword}
          show={showConfirm}
          setShow={setShowConfirm}
        />

        <button
          onClick={handleChangePassword}
          disabled={loading}
          className="
          mt-4
          w-full
          rounded-xl
          bg-[#D4AF37]
          py-3
          text-sm
          font-semibold
          text-black
          transition
          hover:bg-[#E5C158]
          disabled:opacity-50
          "
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}

function PasswordInput({
  label,

  value,

  setValue,

  show,

  setShow,
}: {
  label: string;

  value: string;

  setValue: (value: string) => void;

  show: boolean;

  setShow: (value: boolean) => void;
}) {
  return (
    <div>
      <label
        className="
        mb-2
        block
        text-sm
        text-gray-400
        "
      >
        {label}
      </label>

      <div
        className="
        relative
        "
      >
        <Lock
          size={17}
          className="
          absolute
          left-3
          top-1/2
          -translate-y-1/2
          text-gray-500
          "
        />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="
          h-12
          w-full
          rounded-xl
          border
          border-white/10
          bg-black/30
          pl-10
          pr-12
          text-sm
          text-white
          outline-none
          transition
          focus:border-[#D4AF37]/50
          "
          placeholder="Enter password"
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="
          absolute
          right-3
          top-1/2
          -translate-y-1/2
          text-gray-400
          hover:text-[#D4AF37]
          "
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
