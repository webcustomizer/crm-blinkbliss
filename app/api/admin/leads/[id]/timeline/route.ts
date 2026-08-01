import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

type TimelineEvent = {
  id: string;
  type: "CREATED" | "STATUS_CHANGED" | "FOLLOW_UP" | "ASSIGNED" | "EDITED" | "REMARK" | "PRIORITY" | "ACTIVITY";
  timestamp: string;
  description: string;
  meta?: Record<string, any>;
  user?: { id: string; name: string } | null;
};

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    NEW: "New", CALLED: "Called", NEED_MORE_FOLLOW_UP: "Follow Up",
    TRAINING_ATTENDED: "Training", SEAT_RESERVED: "Reserved",
    JOINED: "Joined", DEAD: "Dead",
  };
  return map[s] || s;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true, name: true, phone: true, createdAt: true,
        assignedToId: true, assignedAt: true,
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: "Lead not found" }, { status: 404 });
    }

    const [statusHistory, followups, activityLogs] = await Promise.all([
      prisma.statusHistory.findMany({
        where: { leadId: id },
        orderBy: { changedAt: "desc" },
        include: { changedBy: { select: { id: true, name: true } } },
      }),
      prisma.followUp.findMany({
        where: { leadId: id },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.activityLog.findMany({
        where: {
          leadId: id,
          action: {
            in: [
              "LEAD_UPDATED", "REMARK_UPDATED", "LEAD_BULK_ACTION",
              "LEAD_MERGED", "LEAD_SOFT_DELETED", "LEAD_RESTORED",
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

    const events: TimelineEvent[] = [];

    // Lead created
    events.push({
      id: `created-${lead.id}`,
      type: "CREATED",
      timestamp: lead.createdAt.toISOString(),
      description: `Lead created${lead.name ? ` — ${lead.name}` : ""} (${lead.phone})`,
    });

    // Assigned event from assignedAt (current/last assignment)
    if (lead.assignedAt && lead.assignedToId) {
      events.push({
        id: `assigned-${lead.id}`,
        type: "ASSIGNED",
        timestamp: lead.assignedAt.toISOString(),
        description: `Lead assigned to ${lead.assignedTo?.name || "a user"}`,
        user: null,
      });
    }

    // Assigned event from activity logs
    for (const a of activityLogs) {
      if (a.action === "LEAD_UPDATED" && a.metadata) {
        const meta = a.metadata as Record<string, any>;
        if (meta.changes?.assignedToId) {
          events.push({
            id: a.id,
            type: "ASSIGNED",
            timestamp: a.createdAt.toISOString(),
            description: a.description,
            user: a.user,
            meta: meta.changes,
          });
          continue;
        }
        if (meta.changes?.isPriority !== undefined) {
          const val = meta.changes.isPriority;
          events.push({
            id: a.id,
            type: "PRIORITY",
            timestamp: a.createdAt.toISOString(),
            description: val ? "Marked as priority" : "Priority removed",
            user: a.user,
          });
          continue;
        }
      }

      if (a.action === "REMARK_UPDATED") {
        const meta = a.metadata as Record<string, any> | null;
        events.push({
          id: a.id,
          type: "REMARK",
          timestamp: a.createdAt.toISOString(),
          description: meta?.remarks ? `Remark updated: "${String(meta.remarks).slice(0, 80)}${String(meta.remarks).length > 80 ? "..." : ""}"` : "Remark updated",
          user: a.user,
        });
        continue;
      }

      // Generic activity
      events.push({
        id: a.id,
        type: "ACTIVITY",
        timestamp: a.createdAt.toISOString(),
        description: a.description,
        user: a.user,
        meta: typeof a.metadata === "object" && a.metadata !== null ? a.metadata as Record<string, any> : undefined,
      });
    }

    // Status changes
    for (const s of statusHistory) {
      events.push({
        id: s.id,
        type: "STATUS_CHANGED",
        timestamp: s.changedAt.toISOString(),
        description: `Status changed from ${statusLabel(s.oldStatus)} to ${statusLabel(s.newStatus)}`,
        user: s.changedBy,
        meta: { oldStatus: s.oldStatus, newStatus: s.newStatus },
      });
    }

    // Follow-ups
    for (const f of followups) {
      events.push({
        id: f.id,
        type: "FOLLOW_UP",
        timestamp: f.createdAt.toISOString(),
        description: `Follow-up #${f.followUpNumber} completed — ${f.remarks || "No remarks"}`,
        user: f.user,
        meta: { followUpNumber: f.followUpNumber, nextFollowUp: f.nextFollowUp?.toISOString() },
      });
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ success: true, data: events });
  } catch (err) {
    console.error("Timeline fetch error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch timeline." }, { status: 500 });
  }
}
