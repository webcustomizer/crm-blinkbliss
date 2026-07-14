"use client";

import { Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import EditSalespersonDialog from "@/components/admin/EditSalespersonDialog";
import ResetSalespersonPasswordDialog from "@/components/admin/ResetSalespersonPasswordDialog";

type Salesperson = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
};

export default function SalespersonTable({
  salespersons,
}: {
  salespersons: Salesperson[];
}) {
  const router = useRouter();

  async function toggleStatus(id: string, currentStatus: boolean) {
    const res = await fetch(`/api/admin/salespersons/${id}`, {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        isActive: !currentStatus,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message);

      return;
    }

    toast.success(data.message);

    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-yellow-600/20 bg-[#181818]">
      <table className="w-full">
        <thead className="bg-[#202020]">
          <tr>
            <th className="px-6 py-4 text-left text-[#D4AF37]">Name</th>

            <th className="px-6 py-4 text-left text-[#D4AF37]">Email</th>

            <th className="px-6 py-4 text-left text-[#D4AF37]">Phone</th>

            <th className="px-6 py-4 text-left text-[#D4AF37]">Status</th>

            <th className="px-6 py-4 text-center text-[#D4AF37]">Actions</th>
          </tr>
        </thead>

        <tbody>
          {salespersons.map((user) => (
            <tr
              key={user.id}
              className="
              border-t
              border-yellow-600/10
              hover:bg-[#202020]
              "
            >
              <td className="px-6 py-4 text-white">{user.name}</td>

              <td className="px-6 py-4 text-gray-300">{user.email}</td>

              <td className="px-6 py-4 text-gray-300">{user.phone || "-"}</td>

              <td className="px-6 py-4">
                <span
                  className={`
                    rounded-full
                    px-3
                    py-1
                    text-sm
                    ${
                      user.isActive
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }
                  `}
                >
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </td>

              <td className="px-6 py-4">
                <div className="flex justify-center gap-4">
                  {/* Edit Account */}
                  <EditSalespersonDialog salesperson={user} />

                  {/* Reset Password */}
                  <ResetSalespersonPasswordDialog
                    salespersonId={user.id}
                    salespersonName={user.name}
                  />

                  {/* Activate / Deactivate */}
                  <button
                    onClick={() => toggleStatus(user.id, user.isActive)}
                    className={
                      user.isActive
                        ? "text-red-400 hover:text-red-300"
                        : "text-green-400 hover:text-green-300"
                    }
                  >
                    <Power size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
