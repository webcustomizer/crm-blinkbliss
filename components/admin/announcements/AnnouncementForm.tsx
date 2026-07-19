"use client";

import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";

export default function AnnouncementForm() {
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");

  const [message, setMessage] = useState("");

  async function publishAnnouncement() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/admin/announcements", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          title,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to publish announcement");
        return;
      }

      toast.success("Announcement published successfully.");

      setTitle("");

      setMessage("");
    } catch (error) {


      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
      rounded-2xl
      border
      border-[#D4AF37]/20
      bg-[#111111]
      p-6
      shadow-xl
      "
    >
      <div className="mb-8 flex items-center gap-3">
        <div
          className="
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-xl
          bg-[#D4AF37]/10
          text-[#D4AF37]
          "
        >
          <Megaphone />
        </div>

        <div>
          <h2
            className="
            text-xl
            font-bold
            text-[#D4AF37]
            "
          >
            New Announcement
          </h2>

          <p className="text-sm text-gray-400">
            Publish a message for all active salespersons.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label
            className="
            mb-2
            block
            text-sm
            text-gray-400
            "
          >
            Title
          </label>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter announcement title..."
            className="
            w-full
            rounded-xl
            border
            border-[#D4AF37]/20
            bg-black/30
            p-3
            text-white
            outline-none
            placeholder:text-gray-500
            focus:border-[#D4AF37]
            "
          />
        </div>

        <div>
          <label
            className="
            mb-2
            block
            text-sm
            text-gray-400
            "
          >
            Message
          </label>

          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your announcement..."
            className="
            w-full
            resize-none
            rounded-xl
            border
            border-[#D4AF37]/20
            bg-black/30
            p-3
            text-white
            outline-none
            placeholder:text-gray-500
            focus:border-[#D4AF37]
            "
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          disabled={loading}
          onClick={publishAnnouncement}
          className="
          flex
          items-center
          gap-2
          rounded-xl
          bg-[#D4AF37]
          px-6
          py-3
          font-semibold
          text-black
          transition
          hover:bg-[#D4AF37]/80
          disabled:cursor-not-allowed
          disabled:opacity-60
          "
        >
          <Send size={18} />

          {loading ? "Publishing..." : "Publish Announcement"}
        </button>
      </div>
    </div>
  );
}
