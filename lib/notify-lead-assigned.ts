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



    const message = `${
      leadName || "New lead"
    } has been assigned to you check it out!`;

    const notification = await prisma.notification.create({
      data: {
        title: "🔔 New Lead Assigned",
        message,
        userId,
        leadId,
        link: `/sales/my-leads?leadId=${leadId}`,
      },
    });



    await sendPushNotification({
      userId,
      title: "🔔 New Lead Assigned",
      message,
      link: `/sales/my-leads?leadId=${leadId}`,
    });


  } catch (error) {
    console.error("❌ Notification failed:", error instanceof Error ? error.message : error);
    // Don't throw — notification failure shouldn't block lead assignment
  }
}
