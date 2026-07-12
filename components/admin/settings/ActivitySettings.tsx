"use client";

import { useState } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";

export default function ActivitySettings() {
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);

  const [confirmText, setConfirmText] = useState("");

  const [message, setMessage] = useState("");

  async function clearActivities() {
    if (confirmText !== "DELETE") return;

    try {
      setLoading(true);

      const res = await fetch("/api/admin/activity/clear", {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);

        setOpen(false);

        setConfirmText("");
      } else {
        setMessage(data.message || "Something went wrong");
      }
    } catch (error) {
      console.log(error);

      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className="
        rounded-2xl
        border
        border-[#D4AF37]/20
        bg-[#161616]
        p-6
        "
      >
        <h2
          className="
          text-lg
          font-semibold
          text-white
          "
        >
          Activity Management
        </h2>

        <p
          className="
          mt-2
          text-sm
          text-zinc-400
          "
        >
          Remove old salesperson activity logs. Lead data will not be affected.
        </p>

        <button
          onClick={() => setOpen(true)}
          className="
          mt-5
          flex
          items-center
          gap-2
          rounded-xl
          bg-red-600
          px-5
          py-3
          text-sm
          font-semibold
          text-white
          hover:bg-red-700
          "
        >
          <Trash2 size={18} />
          Clear Activity Logs
        </button>

        {message && (
          <p
            className="
            mt-4
            text-sm
            text-green-400
            "
          >
            {message}
          </p>
        )}
      </div>

      {open && (
        <div
          className="
          fixed
          inset-0
          z-50
          flex
          items-center
          justify-center
          bg-black/70
          backdrop-blur-sm
          "
        >
          <div
            className="
            w-full
            max-w-md
            rounded-2xl
            border
            border-red-500/30
            bg-[#161616]
            p-6
            "
          >
            <div
              className="
              flex
              items-center
              justify-between
              "
            >
              <div
                className="
                flex
                items-center
                gap-3
                "
              >
                <div
                  className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-red-500/10
                  text-red-500
                  "
                >
                  <AlertTriangle size={22} />
                </div>

                <h3
                  className="
                  text-lg
                  font-semibold
                  text-white
                  "
                >
                  Delete Activity Logs
                </h3>
              </div>

              <button
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                }}
                className="
                text-zinc-400
                hover:text-white
                "
              >
                <X size={20} />
              </button>
            </div>

            <p
              className="
              mt-5
              text-sm
              text-zinc-400
              "
            >
              This action will permanently delete all salesperson activity logs.
              Lead records and CRM data will remain safe.
            </p>

            <p
              className="
              mt-5
              text-sm
              text-white
              "
            >
              Type
              <span className="mx-1 font-bold text-red-500">DELETE</span>
              to continue.
            </p>

            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="
              mt-3
              w-full
              rounded-xl
              border
              border-white/10
              bg-[#111]
              px-4
              py-3
              text-white
              outline-none
              focus:border-red-500
              "
            />

            <div
              className="
              mt-5
              flex
              justify-end
              gap-3
              "
            >
              <button
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                }}
                className="
                rounded-xl
                px-4
                py-2
                text-sm
                text-zinc-400
                hover:text-white
                "
              >
                Cancel
              </button>

              <button
                onClick={clearActivities}
                disabled={confirmText !== "DELETE" || loading}
                className="
                rounded-xl
                bg-red-600
                px-5
                py-2
                text-sm
                font-semibold
                text-white
                disabled:cursor-not-allowed
                disabled:opacity-40
                hover:bg-red-700
                "
              >
                {loading ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
