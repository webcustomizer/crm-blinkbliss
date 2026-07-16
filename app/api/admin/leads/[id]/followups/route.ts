import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

// Pakistan Standard Time = UTC+5 (no daylight saving)
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Safely converts an incoming date string (e.g. "2026-07-20" or
 * "2026-07-20T00:00:00") into a UTC Date that represents 12:00 PM
 * PKT on that calendar day. Using noon avoids any date-shift when
 * the value is later converted to/from UTC, regardless of how the
 * original string was formatted or what timezone the server runs in.
 */
function toPKTSafeDate(dateInput: string): Date | null {
  if (!dateInput) return null;

  // Extract just the YYYY-MM-DD part, ignoring any time/timezone info
  const datePart = dateInput.split("T")[0];

  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) return null;

  const noonPKT = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  // Convert to the real UTC instant to store in DB
  return new Date(noonPKT.getTime() - PKT_OFFSET_MS);
}

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;

    const body = await req.json();

    const { remarks, nextFollowUp, userId } = body;

    if (!remarks || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Remarks and user are required.",
        },
        {
          status: 400,
        },
      );
    }

    const followUp = await prisma.followUp.create({
      data: {
        remarks,

        nextFollowUp: nextFollowUp ? toPKTSafeDate(nextFollowUp) : null,

        leadId: id,

        userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: followUp,
      message: "Follow up added successfully.",
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to add follow up.",
      },
      {
        status: 500,
      },
    );
  }
}
