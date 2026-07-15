import admin from "firebase-admin";
import { prisma } from "@/lib/prisma";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

interface SendPushParams {
  userId: string;
  title: string;
  message: string;
  link?: string;
}

/**
 * Sends a push notification to every device registered to a user.
 * Silently skips if the user has no registered devices (e.g. hasn't
 * opened the app yet, or denied notification permission).
 * Automatically cleans up tokens that Firebase reports as invalid
 * (e.g. app was uninstalled).
 */
export async function sendPushNotification({
  userId,
  title,
  message,
  link,
}: SendPushParams) {
  try {
    const tokens = await prisma.pushToken.findMany({
      where: { userId },
      select: { id: true, token: true },
    });

    if (tokens.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      tokens.map((t) =>
        admin.messaging().send({
          token: t.token,
          notification: {
            title,
            body: message,
          },
          data: link ? { link } : {},
          android: {
            notification: {
              icon: "ic_notification",
              color: "#D4AF37",
            },
          },
        }),
      ),
    );

    // Clean up tokens Firebase says are no longer valid
    const invalidTokenIds: string[] = [];
    results.forEach((result, i) => {
      if (
        result.status === "rejected" &&
        (result.reason?.code ===
          "messaging/registration-token-not-registered" ||
          result.reason?.code === "messaging/invalid-registration-token")
      ) {
        invalidTokenIds.push(tokens[i].id);
      }
    });

    if (invalidTokenIds.length > 0) {
      await prisma.pushToken.deleteMany({
        where: { id: { in: invalidTokenIds } },
      });
    }
  } catch (error) {
    // Push failures should never break the main request (lead assignment,
    // announcement creation, etc.) — just log and move on.
    console.log("Push Notification Error:", error);
  }
}
