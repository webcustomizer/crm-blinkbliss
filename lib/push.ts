import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "@/lib/prisma";

function initFirebaseAdmin(): boolean {
  if (getApps().length > 0) return true;
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      console.error("Firebase credentials missing — push notifications disabled");
      return false;
    }
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return true;
  } catch (e) {
    console.error("Firebase init failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

interface SendPushParams {
  userId: string;
  title: string;
  message: string;
  link?: string;
}

export async function sendPushNotification({ userId, title, message, link }: SendPushParams) {
  try {
    if (!initFirebaseAdmin()) return;

    const tokens = await prisma.pushToken.findMany({
      where: { userId },
      select: { id: true, token: true },
    });
    if (tokens.length === 0) return;

    const results = await Promise.allSettled(
      tokens.map((item) =>
        getMessaging().send({
          token: item.token,
          notification: { title, body: message },
          data: link ? { link } : {},
          android: {
            priority: "high",
            notification: { channelId: "default", icon: "ic_notification", color: "#D4AF37" },
          },
        }),
      ),
    );

    const invalidIds: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected" && (r.reason?.code === "messaging/registration-token-not-registered" || r.reason?.code === "messaging/invalid-registration-token")) {
        invalidIds.push(tokens[i].id);
      }
    });
    if (invalidIds.length > 0) {
      await prisma.pushToken.deleteMany({ where: { id: { in: invalidIds } } });
    }
  } catch (error) {
    console.error("Push notification failed:", error instanceof Error ? error.message : error);
  }
}
