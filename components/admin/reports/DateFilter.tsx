"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function DateFilter({ value, onChange }: Props) {
  const options = [
    {
      value: "ALL",
      label: "All Time",
    },
    {
      value: "TODAY",
      label: "Today",
    },
    {
      value: "WEEK",
      label: "This Week",
    },
    {
      value: "MONTH",
      label: "This Month",
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {options.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`
            rounded-xl
            border
            px-5
            py-2
            text-sm
            transition-all

            ${
              value === item.value
                ? "border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]"
                : "border-white/10 text-gray-300 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5"
            }
          `}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
