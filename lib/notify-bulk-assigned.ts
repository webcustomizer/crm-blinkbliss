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
    console.log(`📋 notifyBulkAssigned called: userId=${userId}, leadCount=${leadCount}, assignedByName=${assignedByName}`);

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

    console.log(`📋 Creating notification for userId=${userId}, role=${assignee.role}, link=${link}`);
    const notification = await prisma.notification.create({
      data: {
        title: "📋 Leads Assigned",
        message,
        userId,
        link,
      },
    });
    console.log(`📋 Notification created: id=${notification.id}`);

    console.log(`📋 Sending push to userId=${userId}`);
    await sendPushNotification({
      userId,
      title: "📋 Leads Assigned",
      message,
      link,
    });

    console.log(`📋 Assignee: teamLeaderId=${assignee?.teamLeaderId}, assignedById=${assignedById}`);
    if (assignee?.teamLeaderId && assignedById !== assignee.teamLeaderId) {
      const tlMessage = `${assignee.name || "A team member"} received ${leadCount} leads${assignedByName ? ` from ${assignedByName}` : ""}`;
      console.log(`📋 Creating TL notification for userId=${assignee.teamLeaderId}`);
      await prisma.notification.create({
        data: {
          title: "🔔 Team Lead Update",
          message: tlMessage,
          userId: assignee.teamLeaderId,
          link: `/team-leader/team/${userId}`,
        },
      });
      console.log(`📋 Sending push to TL userId=${assignee.teamLeaderId}`);
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
