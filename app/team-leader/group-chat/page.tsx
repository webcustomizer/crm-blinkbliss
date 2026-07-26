import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import TeamLeaderGroupChatWrapper from "@/components/team-leader/group-chat/TeamLeaderGroupChatWrapper";

export default async function TeamLeaderGroupChatPage() {
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
      <div className="h-[70vh] space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-28 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="h-3 w-40 animate-pulse rounded-lg bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    }>
      <TeamLeaderGroupChatWrapper currentUserId={user.id} />
    </Suspense>
  );
}
