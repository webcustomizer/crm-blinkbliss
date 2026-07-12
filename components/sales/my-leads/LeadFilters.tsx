"use client";

import { Search, Filter } from "lucide-react";

interface LeadFiltersProps {
  search: string;
  setSearch: (value: string) => void;

  status: string;
  setStatus: (value: string) => void;
}

const statuses = [
  {
    label: "All Status",
    value: "",
  },
  {
    label: "New",
    value: "NEW",
  },
  {
    label: "Called",
    value: "CALLED",
  },
  {
    label: "Need More Follow Up",
    value: "NEED_MORE_FOLLOW_UP",
  },
  {
    label: "Training Attended",
    value: "TRAINING_ATTENDED",
  },
  {
    label: "Seat Reserved",
    value: "SEAT_RESERVED",
  },
  {
    label: "Joined",
    value: "JOINED",
  },
  {
    label: "Dead",
    value: "DEAD",
  },
];

export default function LeadFilters({
  search,
  setSearch,
  status,
  setStatus,
}: LeadFiltersProps) {
  return (
    <div
      className="
      flex
      flex-col
      gap-3

      rounded-2xl
      border
      border-[#D4AF37]/20
      bg-[#161616]
      p-4

      sm:flex-row
      "
    >
      {/* Search */}

      <div
        className="
        relative
        flex-1
        "
      >
        <Search
          size={18}
          className="
          absolute
          left-3
          top-1/2
          -translate-y-1/2
          text-zinc-500
          "
        />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone..."
          className="
          h-11
          w-full
          rounded-xl

          border
          border-[#D4AF37]/20

          bg-[#111111]

          pl-10
          pr-4

          text-sm
          text-white

          outline-none

          placeholder:text-zinc-500

          focus:border-[#D4AF37]
          "
        />
      </div>

      {/* Status */}

      <div
        className="
        relative
        sm:w-64
        "
      >
        <Filter
          size={17}
          className="
          pointer-events-none

          absolute
          left-3
          top-1/2

          -translate-y-1/2

          text-[#D4AF37]
          "
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="
          h-11
          w-full

          appearance-none

          rounded-xl

          border
          border-[#D4AF37]/20

          bg-[#111111]

          pl-10
          pr-4

          text-sm

          text-white

          outline-none

          focus:border-[#D4AF37]
          "
        >
          {statuses.map((item) => (
            <option
              key={item.value}
              value={item.value}
              className="
                  bg-[#161616]
                  text-white
                  "
            >
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
