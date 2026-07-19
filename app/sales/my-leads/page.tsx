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
  } catch {}

  return (
    <Suspense fallback={<div className="p-6 text-[#D4AF37]">Loading...</div>}>
      <MyLeads userId={userId} />
    </Suspense>
  );
}
