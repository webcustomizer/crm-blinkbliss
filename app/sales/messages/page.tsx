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
    <Suspense>
      <SalesMessagesWrapper currentUserId={user.id} />
    </Suspense>
  );
}
