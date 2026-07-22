import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import AdminMessagesWrapper from "@/components/admin/messages/MessagesWrapper";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");
  let user;
  try {
    user = await verifyToken(token);
  } catch {
    redirect("/login");
  }

  const settings = await getCachedCRMSettings();
  if (settings?.messageEnabled === false) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#D4AF37]">Messages</h1>
          <p className="text-gray-400">Chat with your sales team</p>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-8 sm:p-12 max-w-md">
            <ShieldAlert size={40} className="mx-auto text-red-400/60 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Messages Disabled
            </h2>
            <p className="text-gray-400 text-sm">
              1-on-1 messaging has been disabled from Settings → Communication.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">Messages</h1>
        <p className="text-gray-400">Chat with your sales team</p>
      </div>
      <AdminMessagesWrapper />
    </div>
  );
}
