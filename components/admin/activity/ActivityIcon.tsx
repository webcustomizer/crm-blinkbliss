import { LogIn, LogOut, Pencil, RefreshCcw, PhoneCall } from "lucide-react";

export default function ActivityIcon({ action }: { action: string }) {
  if (action === "LOGIN") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10 text-green-400">
        <LogIn size={17} />
      </div>
    );
  }

  if (action === "LOGOUT") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <LogOut size={17} />
      </div>
    );
  }

  if (action === "LEAD_UPDATED") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-400">
        <Pencil size={17} />
      </div>
    );
  }

  if (action === "STATUS_CHANGED") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
        <RefreshCcw size={17} />
      </div>
    );
  }

  if (action === "FOLLOWUP_COMPLETED") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
        <PhoneCall size={17} />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
      ?
    </div>
  );
}
