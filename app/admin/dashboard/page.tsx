import AdminDashboard from "@/components/admin/dashboard/AdminDashboard";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]/80">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <AdminDashboard />
      </div>
    </div>
  );
}