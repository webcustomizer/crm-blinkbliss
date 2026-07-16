import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "@/lib/prisma";

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are missing. Check Vercel environment variables.",
    );
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

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
    initFirebaseAdmin();

    const tokens = await prisma.pushToken.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        token: true,
      },
    });

    if (tokens.length === 0) {
      console.log("No push tokens found for user:", userId);
      return;
    }

    const results = await Promise.allSettled(
      tokens.map((item) =>
        getMessaging().send({
          token: item.token,

          notification: {
            title,
            body: message,
          },

          data: link
            ? {
                link,
              }
            : {},

          android: {
            priority: "high",

            notification: {
              channelId: "default",
              icon: "ic_notification",
              color: "#D4AF37",
            },
          },
        }),
      ),
    );

    const invalidTokenIds: string[] = [];

    results.forEach((result, index) => {
      if (
        result.status === "rejected" &&
        (result.reason?.code ===
          "messaging/registration-token-not-registered" ||
          result.reason?.code === "messaging/invalid-registration-token")
      ) {
        invalidTokenIds.push(tokens[index].id);
      }
    });

    if (invalidTokenIds.length > 0) {
      await prisma.pushToken.deleteMany({
        where: {
          id: {
            in: invalidTokenIds,
          },
        },
      });

      console.log("Removed invalid push tokens:", invalidTokenIds.length);
    }

    console.log("Push notification sent:", {
      userId,
      tokenCount: tokens.length,
    });
  } catch (error) {
    console.error(
      "Push notification failed:",
      error instanceof Error ? error.message : error,
    );
  }
}
