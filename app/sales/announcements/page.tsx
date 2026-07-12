import AnnouncementList from "@/components/sales/Announcement/AnnouncementList";

export default function SalespersonAnnouncementsPage() {
  return (
    <div
      className="
      min-h-screen
      bg-black
      p-4
      sm:p-6
      lg:p-8
      "
    >
      <div
        className="
        mx-auto
        max-w-5xl
        "
      >
        <div
          className="
          mb-6
          rounded-2xl
          border
          border-[#D4AF37]/20
          bg-[#111111]
          p-5
          shadow-xl
          "
        >
          <h1
            className="
            text-2xl
            font-bold
            text-[#D4AF37]
            "
          >
            Announcements
          </h1>

          <p
            className="
            mt-2
            text-sm
            text-gray-400
            "
          >
            Latest updates and important messages from admin.
          </p>
        </div>

        <AnnouncementList />
      </div>
    </div>
  );
}
