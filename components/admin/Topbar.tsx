export default function Topbar() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-yellow-600/20 bg-[#181818] px-8">
      <div>
        <h2 className="text-2xl font-bold text-[#D4AF37]">Dashboard</h2>

        <p className="text-sm text-gray-400">Welcome back, Master Admin</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D4AF37] font-bold text-black">
          A
        </div>
      </div>
    </header>
  );
}
