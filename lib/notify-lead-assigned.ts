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
    // Remove old notification for this lead
    await prisma.notification.deleteMany({
      where: {
        leadId,
      },
    });

    const message = `${
      leadName || "New lead"
    } has been assigned to you check it out!`;

    // Create in-app notification
    await prisma.notification.create({
      data: {
        title: "🔔 New Lead Assigned",
        message,
        userId,
        leadId,
        link: `/sales/my-leads?leadId=${leadId}`,
      },
    });

    // Send push notification
    await sendPushNotification({
      userId,
      title: "🔔 New Lead Assigned",
      message,
      link: `/sales/my-leads?leadId=${leadId}`,
    });

    console.log("Lead assignment notification sent:", {
      userId,
      leadId,
    });
  } catch (error) {
    console.error("Lead assignment notification error:", error);
  }
}
