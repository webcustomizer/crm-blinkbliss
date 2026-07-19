import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateAdminSettings from "@/components/admin/settings/CreateAdminSettings";
import FollowUpSettings from "@/components/admin/settings/FollowUpSettings";
import DeadLeadSettings from "@/components/admin/settings/DeadLeadSettings";
import AutomationSettings from "@/components/admin/settings/AutomationSettings";
import ImportLeadsSection from "@/components/admin/settings/ImportLeadsSection";
import ExportLeadsSection from "@/components/admin/settings/ExportLeadsSection";
import CommunicationSettings from "@/components/admin/settings/CommunicationSettings";
import SecuritySettings from "@/components/admin/settings/SecuritySettings";
import BackupSettings from "@/components/admin/settings/BackupSettings";
import ActivitySettings from "@/components/admin/settings/ActivitySettings";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">Settings</h1>
        <p className="text-gray-400">Manage CRM configuration and preferences</p>
      </div>

      <Suspense fallback={<div className="text-gray-400">Loading settings…</div>}>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="flex flex-wrap gap-2 mb-6 bg-transparent">
            <TabBtn value="general" label="General" />
            <TabBtn value="followup" label="Follow-ups" />
            <TabBtn value="automation" label="Automation" />
            <TabBtn value="groupchat" label="Communication" />
            <TabBtn value="security" label="Security" />
            <TabBtn value="backup" label="Backup" />
            <TabBtn value="import" label="Import" />
            <TabBtn value="export" label="Export" />
            <TabBtn value="admin" label="Admin" />
            <TabBtn value="activity" label="Activity" />
          </TabsList>

          <TabsContent value="general">
            <DeadLeadSettings />
          </TabsContent>
          <TabsContent value="followup">
            <FollowUpSettings />
          </TabsContent>
          <TabsContent value="automation">
            <AutomationSettings />
          </TabsContent>
          <TabsContent value="groupchat">
            <CommunicationSettings />
          </TabsContent>
          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>
          <TabsContent value="backup">
            <BackupSettings />
          </TabsContent>
          <TabsContent value="import">
            <ImportLeadsSection />
          </TabsContent>
          <TabsContent value="export">
            <ExportLeadsSection />
          </TabsContent>
          <TabsContent value="admin">
            <CreateAdminSettings />
          </TabsContent>
          <TabsContent value="activity">
            <ActivitySettings />
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}

function TabBtn({ value, label }: { value: string; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-xl border border-white/10 px-4 py-2 text-sm data-[state=active]:border-[#D4AF37]/60 data-[state=active]:bg-[#D4AF37]/15 data-[state=active]:text-[#D4AF37] text-gray-400 hover:text-white transition-colors"
    >
      {label}
    </TabsTrigger>
  );
}
