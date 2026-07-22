import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import SalesMessagesWrapper from "@/components/sales/messages/SalesMessagesWrapper";

export default async function SalesMessagesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");
  let user;
  try {
    user = await verifyToken(token);
  } catch {
    redirect("/login");
  }

  return (
    <Suspense fallback={
      <div className="flex h-[70vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
          <p className="text-sm text-white/40">Loading messages…</p>
        </div>
      </div>
    }>
      <SalesMessagesWrapper currentUserId={user.id} />
    </Suspense>
  );
}
