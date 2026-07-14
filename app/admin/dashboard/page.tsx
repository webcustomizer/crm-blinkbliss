import AdminDashboard from "@/components/admin/dashboard/AdminDashboard";

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a]">
      {/* soft gradient wash */}
      <div
        aria-hidden
        className="
        pointer-events-none
        absolute
        inset-0
        bg-[radial-gradient(circle_at_15%_10%,rgba(212,175,55,0.10),transparent_45%),radial-gradient(circle_at_85%_0%,rgba(139,92,246,0.08),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.06),transparent_45%)]
        "
      />

      {/* floating glass orbs for depth */}
      <div
        aria-hidden
        className="
        pointer-events-none
        absolute
        -left-32
        -top-32
        h-96
        w-96
        rounded-full
        bg-[#D4AF37]/10
        blur-[100px]
        "
      />
      <div
        aria-hidden
        className="
        pointer-events-none
        absolute
        -bottom-40
        -right-20
        h-[28rem]
        w-[28rem]
        rounded-full
        bg-purple-500/10
        blur-[120px]
        "
      />
      <div
        aria-hidden
        className="
        pointer-events-none
        absolute
        left-1/3
        top-1/2
        h-72
        w-72
        -translate-y-1/2
        rounded-full
        bg-blue-500/5
        blur-[100px]
        "
      />

      {/* subtle noise/grid overlay */}
      <div
        aria-hidden
        className="
        pointer-events-none
        absolute
        inset-0
        bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)]
        bg-[size:48px_48px]
        "
      />

      {/* glass panel wrapping the dashboard */}
      <div className="relative mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div
          className="
          rounded-[32px]
          border
          border-white/10
          bg-white/[0.03]
          p-3
          shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]
          backdrop-blur-2xl
          sm:p-5
          "
        >
          <AdminDashboard />
        </div>
      </div>
    </div>
  );
}
