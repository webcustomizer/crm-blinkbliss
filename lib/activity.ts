import { prisma } from "@/lib/prisma";
import { ActivityAction } from "@/app/generated/prisma/client";

interface LogActivityParams {
  userId: string;
  leadId?: string;
  action: ActivityAction;
  description: string;
  metadata?: unknown;
}

export async function logActivity({
  userId,
  leadId,
  action,
  description,
  metadata,
}: LogActivityParams) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        leadId,
        action,
        description,
        metadata: metadata === undefined ? undefined : (metadata as object),
      },
    });
  } catch (error) {
    console.error("Activity Log Error:", error);

    // Activity logging should never break the main request.
  }
}
