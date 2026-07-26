import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

interface NotifyEligibleParams {
  userId: string;
  userName: string;
}

export async function notifyEligible({ userId, userName }: NotifyEligibleParams) {
  try {
    const title = "🏆 Eligible for Team Leader";
    const message = `Congratulations ${userName}! You've been marked as eligible for the Team Leader position. Talk to your admin to learn more.`;

    await prisma.notification.create({
      data: {
        title,
        message,
        userId,
        link: "/sales/profile",
      },
    });

    await sendPushNotification({
      userId,
      title,
      message,
      link: "/sales/profile",
    });
  } catch (error) {
    console.error("❌ Eligible notification failed:", error instanceof Error ? error.message : error);
  }
}
