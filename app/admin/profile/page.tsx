import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminProfileHeader from "@/components/admin/profile/AdminProfileHeader";
import AdminPersonalInfoCard from "@/components/admin/profile/AdminPersonalInfoCard";
import AdminChangePasswordCard from "@/components/admin/profile/AdminChangePasswordCard";

export default async function AdminProfilePage(props: { searchParams: Promise<{ forceChange?: string }> }) {
  const { forceChange } = await props.searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  const user = await verifyToken(token);
  if (user.role !== "ADMIN") redirect("/login");

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!profile) redirect("/login");

  const lastSession = await prisma.loginSession.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const [totalLeads, totalSalespersons, totalCustomers] = await prisma.$transaction([
    prisma.lead.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { role: "SALESPERSON" } }),
    prisma.lead.count({ where: { isDeleted: false, status: "JOINED" } }),
  ]);

  const formattedProfile = {
    ...profile,
    createdAt: profile.createdAt.toLocaleDateString("en-US", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    lastLoginAt: lastSession?.createdAt
      ? lastSession.createdAt.toLocaleDateString("en-US", {
          timeZone: "Asia/Karachi",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : null,
  };

  return (
    <main className="min-h-screen rounded-3xl bg-black p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <AdminProfileHeader
          profile={formattedProfile}
          stats={{ totalLeads, totalSalespersons, totalCustomers }}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AdminPersonalInfoCard profile={formattedProfile} />
          <AdminChangePasswordCard forceChange={forceChange === "true"} />
        </div>
      </div>
    </main>
  );
}
