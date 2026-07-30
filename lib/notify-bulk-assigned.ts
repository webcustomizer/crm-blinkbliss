import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

interface NotifyBulkAssignedParams {
  userId: string;
  leadCount: number;
  assignedByName?: string;
  assignedById?: string;
}

export async function notifyBulkAssigned({
  userId,
  leadCount,
  assignedByName,
  assignedById,
}: NotifyBulkAssignedParams) {
  try {
    const assignee = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, teamLeaderId: true, name: true },
    });
    if (!assignee) {
      console.error(`❌ User ${userId} not found for bulk notification`);
      return;
    }

    const isSalesperson = assignee.role === 'SALESPERSON';
    const link = isSalesperson ? '/sales/my-leads' : '/team-leader/dashboard';

    const prefix = assignedByName
      ? `${leadCount} leads have been assigned to you by ${assignedByName}`
      : `${leadCount} leads have been assigned to you`;
    const message = `${prefix}. Check them out!`;

    const notification = await prisma.notification.create({
      data: {
        title: "📋 Leads Assigned",
        message,
        userId,
        link,
      },
    });

    await sendPushNotification({
      userId,
      title: "📋 Leads Assigned",
      message,
      link,
    });

    if (assignee?.teamLeaderId && assignedById !== assignee.teamLeaderId) {
      const tlMessage = `${assignee.name || "A team member"} received ${leadCount} leads${assignedByName ? ` from ${assignedByName}` : ""}`;
      await prisma.notification.create({
        data: {
          title: "🔔 Team Lead Update",
          message: tlMessage,
          userId: assignee.teamLeaderId,
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

    return notification;
  } catch (error) {
    console.error("❌ Bulk notification failed:", error instanceof Error ? error.message : error);
  }
}
