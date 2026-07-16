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
  console.log("🔔 notifyLeadAssigned START", {
    userId,
    leadId,
    leadName,
  });

  try {
    await prisma.notification.deleteMany({
      where: {
        leadId,
      },
    });

    console.log("✅ Old notifications deleted");

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

    console.log("✅ DB notification created", notification.id);

    await sendPushNotification({
      userId,
      title: "🔔 New Lead Assigned",
      message,
      link: `/sales/my-leads?leadId=${leadId}`,
    });

    console.log("✅ Push sent successfully");
  } catch (error) {
    console.error("❌ Notification failed:", error);
    throw error;
  }
}
