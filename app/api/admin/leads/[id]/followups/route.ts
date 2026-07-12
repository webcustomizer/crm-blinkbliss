import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
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

        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,

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
