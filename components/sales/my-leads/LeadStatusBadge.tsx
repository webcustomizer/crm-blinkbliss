interface LeadStatusBadgeProps {
  status: string;
}

const statusConfig: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  NEW: {
    label: "New",
    className: "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]",
  },

  CALLED: {
    label: "Called",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  },

  NEED_MORE_FOLLOW_UP: {
    label: "Need Follow Up",
    className: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  },

  TRAINING_ATTENDED: {
    label: "Training",
    className: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  },

  SEAT_RESERVED: {
    label: "Reserved",
    className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  },

  JOINED: {
    label: "Joined",
    className: "border-green-500/30 bg-green-500/10 text-green-400",
  },

  DEAD: {
    label: "Dead",
    className: "border-red-500/30 bg-red-500/10 text-red-400",
  },
};

export default function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  };

  return (
    <span
      className={`
      inline-flex
      items-center

      rounded-full

      border

      px-3
      py-1

      text-xs
      font-medium

      ${config.className}
      `}
    >
      {config.label}
    </span>
  );
}
