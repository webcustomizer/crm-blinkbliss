import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import AdminChangePasswordCard from "@/components/admin/profile/AdminChangePasswordCard";

export default async function AdminProfilePage(props: { searchParams: Promise<{ forceChange?: string }> }) {
  const { forceChange } = await props.searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  const user = await verifyToken(token);
  if (user.role !== "ADMIN") redirect("/login");

  return (
    <main className="min-h-screen rounded-3xl bg-black p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#D4AF37]">Profile</h1>
          <p className="text-gray-400">Manage your account security</p>
        </div>
        <AdminChangePasswordCard forceChange={forceChange === "true"} />
      </div>
    </main>
  );
}
