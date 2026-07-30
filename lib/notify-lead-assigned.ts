import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

export async function notifyLeadAssigned({
  userId,
  leadId,
  leadName,
}: {
  userId: string;
  leadId: string;
  leadName: string | null;
}) {


  try {
    await prisma.notification.deleteMany({
      where: {
        leadId,
      },
    });

    const assignee = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, teamLeaderId: true, name: true },
    });

    const isSalesperson = assignee?.role === 'SALESPERSON';
    const link = isSalesperson ? `/sales/my-leads?leadId=${leadId}` : `/team-leader/dashboard`;

    const message = `${
      leadName || "New lead"
    } has been assigned to you check it out!`;

    await prisma.notification.create({
      data: {
        title: "🔔 New Lead Assigned",
        message,
        userId,
        leadId,
        link,
      },
    });



    await sendPushNotification({
      userId,
      title: "🔔 New Lead Assigned",
      message,
      link,
    });

    // Also notify the team leader if the assignee has one
    if (assignee?.teamLeaderId) {
      const tlMessage = `${assignee.name || "A team member"} received a new lead: ${leadName || "New lead"}`;
      await prisma.notification.create({
        data: {
          title: "🔔 Team Lead Update",
          message: tlMessage,
          userId: assignee.teamLeaderId,
          leadId,
          link: `/team-leader/team/${userId}`,
        },
      });
      await sendPushNotification({
        userId: assignee.teamLeaderId,
        title: "🔔 Team Lead Update",
        message: tlMessage,
        link: `/team-leader/team/${userId}`,
      });
    }

  } catch (error) {
    console.error("❌ Notification failed:", error instanceof Error ? error.message : error);
    // Don't throw — notification failure shouldn't block lead assignment
  }
}
