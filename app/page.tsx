import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifyToken } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (token) {
    try {
      const user = await verifyToken(token);

      if (user.role === "ADMIN") {
        redirect("/admin/dashboard");
      }

      redirect("/sales/dashboard");
    } catch (error) {
      // Invalid/expired token — fall through and send to login

    }
  }

  redirect("/login");
}
