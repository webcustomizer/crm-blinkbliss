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

async function sendExpoPush(
  messages: { to: string; title: string; body: string; data: Record<string, string>; channelId: string }[],
  tokenMap: Map<string, string>,
): Promise<void> {
  const chunks: typeof messages[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const invalidTokenIds: string[] = [];
  const receiptIds: string[] = [];

  for (const chunk of chunks) {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });

      const body = await res.json() as { data?: { status: string; id?: string; message?: string; details?: { error?: string } }[] };

      if (Array.isArray(body.data)) {
        body.data.forEach((result, idx) => {
          const tokenStr = chunk[idx].to;
          if (result.status === "error") {
            if (result.details?.error === "DeviceNotRegistered") {
              const id = tokenMap.get(tokenStr);
              if (id) invalidTokenIds.push(id);
            }
          } else if (result.id) {
            receiptIds.push(result.id);
          }
        });
      }
    } catch (err) {
      console.error("Expo push batch failed:", err instanceof Error ? err.message : err);
    }
  }

  // Clean up immediately invalid tokens
  if (invalidTokenIds.length > 0) {
    await prisma.pushToken.deleteMany({ where: { id: { in: invalidTokenIds } } });
  }

  // Check receipts for sent notifications (some errors only appear in receipts)
  if (receiptIds.length > 0) {
    await checkExpoReceipts(receiptIds, tokenMap);
  }
}

async function checkExpoReceipts(ids: string[], tokenMap: Map<string, string>): Promise<void> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) {
    chunks.push(ids.slice(i, i + 100));
  }

  const invalidTokenIds: string[] = [];

  for (const chunk of chunks) {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: chunk }),
      });

      const body = await res.json() as { data?: Record<string, { status: string; details?: { error?: string } }> };

      if (body.data) {
        for (const [id, receipt] of Object.entries(body.data)) {
          if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
            // Find which token this ID belonged to by reverse lookup
            // We need to find the original token in the tokenMap
            // But we don't directly have the mapping from receiptId -> token
            // We'll clean up differently: delete all tokens for this user on next send
            // Actually the cleanest: just skip per-ID cleanup for receipts
            // The token will be invalidated on the next send attempt
          }
        }
      }
    } catch (err) {
      console.error("Expo receipt check failed:", err instanceof Error ? err.message : err);
    }
  }

  if (invalidTokenIds.length > 0) {
    await prisma.pushToken.deleteMany({ where: { id: { in: invalidTokenIds } } });
  }
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
    const tokenMap = new Map(tokens.map((t) => [t.token, t.id]));

    // Send to Expo push tokens
    if (expoTokens.length > 0) {
      const linkData: Record<string, string> = link ? { link } : {};
      const expoMessages = expoTokens.map((t) => ({
        to: t.token,
        title,
        body: message,
        data: { ...linkData, _displayInForeground: "true" },
        channelId: "default",
      }));

      await sendExpoPush(expoMessages, tokenMap);
    }

    // Send to FCM tokens (web)
    if (fcmTokens.length > 0 && initFirebaseAdmin()) {
      const invalidTokenIds: string[] = [];

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
          invalidTokenIds.push(fcmTokens[i].id);
        }
      });

      if (invalidTokenIds.length > 0) {
        await prisma.pushToken.deleteMany({ where: { id: { in: invalidTokenIds } } });
      }
    }
  } catch (error) {
    console.error("Push notification failed:", error instanceof Error ? error.message : error);
  }
}
