import {
  LogIn,
  LogOut,
  Pencil,
  RefreshCcw,
  PhoneCall,
  MessageSquareText,
  Megaphone,
  KeyRound,
  Activity,
} from "lucide-react";

const ICON_MAP: Record<
  string,
  { icon: React.ReactNode; ring: string; bg: string; text: string }
> = {
  LOGIN: {
    icon: <LogIn size={16} strokeWidth={1.75} />,
    ring: "border-emerald-500/25",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
  LOGOUT: {
    icon: <LogOut size={16} strokeWidth={1.75} />,
    ring: "border-red-500/25",
    bg: "bg-red-500/10",
    text: "text-red-400",
  },
  LEAD_UPDATED: {
    icon: <Pencil size={16} strokeWidth={1.75} />,
    ring: "border-yellow-500/25",
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
  },
  STATUS_CHANGED: {
    icon: <RefreshCcw size={16} strokeWidth={1.75} />,
    ring: "border-purple-500/25",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
  },
  FOLLOWUP_COMPLETED: {
    icon: <PhoneCall size={16} strokeWidth={1.75} />,
    ring: "border-blue-500/25",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
  },
  REMARK_UPDATED: {
    icon: <MessageSquareText size={16} strokeWidth={1.75} />,
    ring: "border-cyan-500/25",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
  },
  ANNOUNCEMENT_CREATED: {
    icon: <Megaphone size={16} strokeWidth={1.75} />,
    ring: "border-orange-500/25",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
  },
  PASSWORD_CHANGED: {
    icon: <KeyRound size={16} strokeWidth={1.75} />,
    ring: "border-pink-500/25",
    bg: "bg-pink-500/10",
    text: "text-pink-400",
  },
};

export default function ActivityIcon({ action }: { action: string }) {
  const config = ICON_MAP[action];

  const { icon, ring, bg, text } = config || {
    icon: <Activity size={16} strokeWidth={1.75} />,
    ring: "border-[#D4AF37]/25",
    bg: "bg-[#D4AF37]/10",
    text: "text-[#D4AF37]",
  };

  return (
    <div
      className={`
      relative
      flex
      h-9
      w-9
      shrink-0
      items-center
      justify-center
      rounded-full
      border
      ${ring}
      ${bg}
      ${text}
      shadow-[0_0_0_3px_rgba(0,0,0,0.4)]
      `}
    >
      {icon}
    </div>
  );
}
