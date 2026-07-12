import AnnouncementForm from "@/components/admin/announcements/AnnouncementForm";
import AnnouncementList from "@/components/admin/announcements/AnnouncementList";

export default function AnnouncementsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Announcements</h1>

        <p className="mt-2 text-gray-400">
          Send announcements to every salesperson.
        </p>
      </div>

      <AnnouncementForm />

      <AnnouncementList />
    </div>
  );
}
