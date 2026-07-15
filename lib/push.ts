import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "@/lib/prisma";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}
// coment
interface SendPushParams {
  userId: string;
  title: string;
  message: string;
  link?: string;
}

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
        getMessaging().send({
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
    console.log("Push Notification Error:", error);
  }
}
