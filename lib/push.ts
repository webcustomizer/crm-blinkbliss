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

function isExpoPushToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

interface SendPushParams {
  userId: string;
  title: string;
  message: string;
  link?: string;
}

async function sendExpoPush(messages: { to: string; title: string; body: string; data: Record<string, string>; channelId: string }[]) {
  const chunks: typeof messages[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const invalidTokens: string[] = [];

  for (const chunk of chunks) {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });

      const data = await res.json() as { data?: { status: string; message?: string; details?: { error?: string } }[] };

      if (Array.isArray(data.data)) {
        data.data.forEach((result, idx) => {
          if (result.status === "error" && result.details?.error === "DeviceNotRegistered") {
            invalidTokens.push(chunk[idx].to);
          }
        });
      }
    } catch (err) {
      console.error("Expo push batch failed:", err instanceof Error ? err.message : err);
    }
  }

  return invalidTokens;
}

export async function sendPushNotification({ userId, title, message, link }: SendPushParams) {
  try {
    const tokens = await prisma.pushToken.findMany({
      where: { userId },
      select: { id: true, token: true },
    });
    if (tokens.length === 0) return;

    const expoTokens = tokens.filter((t) => isExpoPushToken(t.token));
    const fcmTokens = tokens.filter((t) => !isExpoPushToken(t.token));

    const invalidIds: string[] = [];

    // Send to Expo push tokens
    if (expoTokens.length > 0) {
      const linkData: Record<string, string> = link ? { link } : {};
      const expoMessages: { to: string; title: string; body: string; data: Record<string, string>; channelId: string }[] = expoTokens.map((t) => ({
        to: t.token,
        title,
        body: message,
        data: linkData,
        channelId: "default",
      }));

      const invalidExpoTokens = await sendExpoPush(expoMessages);
      invalidExpoTokens.forEach((token) => {
        const match = expoTokens.find((t) => t.token === token);
        if (match) invalidIds.push(match.id);
      });
    }

    // Send to FCM tokens (Capacitor web app)
    if (fcmTokens.length > 0 && initFirebaseAdmin()) {
      const results = await Promise.allSettled(
        fcmTokens.map((item) =>
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

      results.forEach((r, i) => {
        if (r.status === "rejected" && (r.reason?.code === "messaging/registration-token-not-registered" || r.reason?.code === "messaging/invalid-registration-token")) {
          invalidIds.push(fcmTokens[i].id);
        }
      });
    }

    if (invalidIds.length > 0) {
      await prisma.pushToken.deleteMany({ where: { id: { in: invalidIds } } });
    }
  } catch (error) {
    console.error("Push notification failed:", error instanceof Error ? error.message : error);
  }
}
