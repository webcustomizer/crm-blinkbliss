"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarClock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function FollowUpSettings() {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstFollowUpDays: 7,
    secondFollowUpDays: 15,
    thirdFollowUpDays: 30,
    deadAfterDays: 37,
  });

  const getSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        cache: "no-store",
      });

      const json = await res.json();

      if (json.success) {
        setForm({
          firstFollowUpDays: json.data.firstFollowUpDays,

          secondFollowUpDays: json.data.secondFollowUpDays,

          thirdFollowUpDays: json.data.thirdFollowUpDays,

          deadAfterDays: json.data.deadAfterDays,
        });
      }
    } catch (error) {
      console.log("GET SETTINGS ERROR:", error);

      toast.error("Failed to load settings");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(getSettings);
  }, [getSettings]);

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((previous) => ({
      ...previous,

      [e.target.name]: Number(e.target.value),
    }));
  }

  async function saveSettings() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (json.success) {
        toast.success("Follow up settings updated");
      } else {
        toast.error(json.message || "Update failed");
      }
    } catch (error) {
      console.log("SAVE SETTINGS ERROR:", error);

      toast.error("Failed to save settings");
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
          <CalendarClock />
        </div>

        <div>
          <h2
            className="
          text-xl
          font-bold
          text-[#D4AF37]
          "
          >
            Follow Up Settings
          </h2>

          <p className="text-sm text-gray-400">
            Manage automatic follow up schedule
          </p>
        </div>
      </div>

      <div
        className="
        grid
        grid-cols-1
        gap-5
        md:grid-cols-2
        "
      >
        <SettingInput
          label="First Follow Up After (Days)"
          name="firstFollowUpDays"
          value={form.firstFollowUpDays}
          onChange={change}
        />

        <SettingInput
          label="Second Follow Up After (Days)"
          name="secondFollowUpDays"
          value={form.secondFollowUpDays}
          onChange={change}
        />

        <SettingInput
          label="Third Follow Up After (Days)"
          name="thirdFollowUpDays"
          value={form.thirdFollowUpDays}
          onChange={change}
        />

        <SettingInput
          label="Move To Dead After (Days)"
          name="deadAfterDays"
          value={form.deadAfterDays}
          onChange={change}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          disabled={loading}
          onClick={saveSettings}
          className="
          bg-[#D4AF37]
          text-black
          hover:bg-[#D4AF37]/80
          "
        >
          <Save size={18} />

          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

function SettingInput({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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

      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        className="
        w-full
        rounded-xl
        border
        border-[#D4AF37]/20
        bg-black/30
        p-3
        text-white
        outline-none
        focus:border-[#D4AF37]
        "
      />
    </div>
  );
}
