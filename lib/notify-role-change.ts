import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

type NotificationType = "promoted" | "assigned" | "demoted";

interface NotifyRoleChangeParams {
  userId: string;
  type: NotificationType;
  teamLeaderName?: string;
}

const NOTIFICATION_CONFIG: Record<NotificationType, { title: string; getMessage: (teamLeaderName?: string) => string; link: string }> = {
  promoted: {
    title: "🎉 Promotion",
    getMessage: () => "Congratulations! You've been promoted to Team Leader.",
    link: "/team-leader/dashboard",
  },
  assigned: {
    title: "👥 Team Assignment",
    getMessage: (tlName) => `You've been assigned to ${tlName}'s team. Your Team Leader is ${tlName}.`,
    link: "/sales/dashboard",
  },
  demoted: {
    title: "📋 Role Change",
    getMessage: () => "Your role has been changed back to Salesperson.",
    link: "/sales/dashboard",
  },
};

export async function notifyRoleChange({ userId, type, teamLeaderName }: NotifyRoleChangeParams) {
  try {
    const config = NOTIFICATION_CONFIG[type];
    const message = config.getMessage(teamLeaderName);

    await prisma.notification.create({
      data: {
        title: config.title,
        message,
        userId,
        link: config.link,
      },
    });

    await sendPushNotification({
      userId,
      title: config.title,
      message,
      link: config.link,
    });
  } catch (error) {
    console.error("Role change notification failed:", error instanceof Error ? error.message : error);
  }
}
