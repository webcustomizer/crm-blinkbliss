import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import SalesGroupChatWrapper from "@/components/sales/groupchat/SalesGroupChatWrapper";

export default async function SalesGroupChatPage() {
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
    <Suspense>
      <SalesGroupChatWrapper currentUserId={user.id} />
    </Suspense>
  );
}
