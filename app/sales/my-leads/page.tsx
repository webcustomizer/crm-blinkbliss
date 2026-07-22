import { Suspense } from "react";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import MyLeads from "@/components/sales/my-leads/MyLeads";

export default async function Page() {
  let userId = "";
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (token) {
      const user = await verifyToken(token);
      userId = user.id;
    }
  } catch (e) { console.error("Failed to verify token:", e); }

  return (
    <Suspense fallback={
      <div className="space-y-4 p-4 sm:p-6">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-20 animate-pulse rounded-xl bg-white/[0.06]" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="h-3 w-24 animate-pulse rounded-lg bg-white/[0.04]" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    }>
      <MyLeads userId={userId} />
    </Suspense>
  );
}
