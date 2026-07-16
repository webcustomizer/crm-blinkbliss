"use client";

import ActivitySettings from "@/components/admin/settings/ActivitySettings";
import AutomationSettings from "@/components/admin/settings/AutomationSettings";
import CreateAdminSettings from "@/components/admin/settings/CreateAdminSettings";
import DeadLeadSettings from "@/components/admin/settings/DeadLeadSettings";
import ExportLeadsSection from "@/components/admin/settings/ExportLeadsSection";
import FollowUpSettings from "@/components/admin/settings/FollowUpSettings";
import ImportLeadsSection from "@/components/admin/settings/ImportLeadsSection";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}

      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">Settings</h1>

        <p className="mt-2 text-gray-400">
          Manage CRM configuration and automation rules
        </p>
      </div>

      {/* SETTINGS COMPONENTS */}

      <CreateAdminSettings />
      <FollowUpSettings />
      <ImportLeadsSection />
      <ExportLeadsSection />
      <AutomationSettings />
      <ActivitySettings />
      <DeadLeadSettings />
    </div>
  );
}
