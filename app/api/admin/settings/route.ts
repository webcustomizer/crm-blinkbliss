import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

// GET SETTINGS

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    let setting = await prisma.cRMSetting.findFirst();

    // agar setting nahi hai to default create

    if (!setting) {
      setting = await prisma.cRMSetting.create({
        data: {
          firstFollowUpDays: 0,
          secondFollowUpDays: 7,
          thirdFollowUpDays: 20,
          maxFollowUps: 3,
          autoDeadEnabled: true,
          deadAfterDays: 30,
        },
      });
    }

    return NextResponse.json({
      success: true,

      data: setting,
    });
  } catch (error) {
    console.log("GET SETTINGS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get settings",
      },
      {
        status: 500,
      },
    );
  }
}

// UPDATE SETTINGS

// UPDATE SETTINGS

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();

    const setting = await prisma.cRMSetting.findFirst();

    if (!setting) {
      return NextResponse.json(
        {
          success: false,
          message: "Settings not found",
        },
        {
          status: 404,
        },
      );
    }

    const updated = await prisma.cRMSetting.update({
      where: {
        id: setting.id,
      },

      data: {
        firstFollowUpDays:
          body.firstFollowUpDays !== undefined
            ? Number(body.firstFollowUpDays)
            : setting.firstFollowUpDays,

        secondFollowUpDays:
          body.secondFollowUpDays !== undefined
            ? Number(body.secondFollowUpDays)
            : setting.secondFollowUpDays,

        thirdFollowUpDays:
          body.thirdFollowUpDays !== undefined
            ? Number(body.thirdFollowUpDays)
            : setting.thirdFollowUpDays,

        deadAfterDays:
          body.deadAfterDays !== undefined
            ? Number(body.deadAfterDays)
            : setting.deadAfterDays,

        maxFollowUps:
          body.maxFollowUps !== undefined
            ? Number(body.maxFollowUps)
            : setting.maxFollowUps,

        autoDeadEnabled:
          body.autoDeadEnabled !== undefined
            ? Boolean(body.autoDeadEnabled)
            : setting.autoDeadEnabled,
      },
    });

    return NextResponse.json({
      success: true,

      message: "Settings updated",

      data: updated,
    });
  } catch (error) {
    console.log("UPDATE SETTINGS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update settings",
      },
      {
        status: 500,
      },
    );
  }
}
