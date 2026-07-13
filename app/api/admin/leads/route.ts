import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GOOGLE_SHEET_WEBHOOK = process.env.GOOGLE_SHEET_WEBHOOK;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Number(searchParams.get("page") || 1);

    const limit = Number(searchParams.get("limit") || 20);

    const search = searchParams.get("search") || "";

    const filter = searchParams.get("filter") || "ALL";

    const salespersonId = searchParams.get("salespersonId") || "";

    const skip = (page - 1) * limit;

    const where: any = {};

    // Search
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          phone: {
            contains: search,
          },
        },

        {
          city: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Salesperson Filter
    if (salespersonId) {
      where.assignedToId = salespersonId;
    }

    // Status Filters

    // Status Filters

    if (filter !== "ALL") {
      if (filter === "INCOMPLETE") {
        where.completion = "INCOMPLETE";
      } else if (filter === "UNASSIGNED") {
        where.assignedToId = null;
      } else if (filter === "TODAY_FOLLOW_UP") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        where.nextFollowUp = {
          gte: start,
          lte: end,
        };

        where.status = {
          notIn: ["JOINED", "DEAD"],
        };
      } else if (filter === "OVERDUE_FOLLOW_UP") {
        where.nextFollowUp = {
          lt: new Date(),
        };

        where.status = {
          notIn: ["JOINED", "DEAD"],
        };
      } else {
        where.status = filter;
      }
    }

    const total = await prisma.lead.count({
      where,
    });

    const leads = await prisma.lead.findMany({
      where,

      skip,

      take: limit,

      orderBy: {
        createdAt: "desc",
      },

      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,

      data: leads,

      pagination: {
        page,

        limit,

        total,

        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch leads.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      phone,
      email,
      city,
      age,
      purpose,
      currentStatus,
      bestTimeToReach,
      willingToAttendTraining,
    } = body;

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone is required.",
        },
        {
          status: 400,
        },
      );
    }
    // Check duplicate phone

    const existingPhone = await prisma.lead.findFirst({
      where: {
        phone,
      },
    });

    if (existingPhone) {
      return NextResponse.json(
        {
          success: false,
          message: "A lead with this phone number already exists.",
        },
        {
          status: 409,
        },
      );
    }

    // Check duplicate email (only if email provided)

    if (email && email.trim() !== "") {
      const existingEmail = await prisma.lead.findFirst({
        where: {
          email: email.trim(),
        },
      });

      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "A lead with this email already exists.",
          },
          {
            status: 409,
          },
        );
      }
    }
    const lead = await prisma.lead.create({
      data: {
        name: name || null,

        phone,

        email: email || null,

        city: city || null,

        age: age ? Number(age) : null,

        purpose: purpose || null,

        currentStatus: currentStatus || null,

        bestTimeToReach: bestTimeToReach || null,

        willingToAttendTraining: willingToAttendTraining ?? null,

        status: "NEW",

        completion: "INCOMPLETE",

        remarks: null,
      },
    });

    // =======================================
    // SAVE TO GOOGLE SHEET
    // =======================================

    if (GOOGLE_SHEET_WEBHOOK) {
      try {
        const response = await fetch(GOOGLE_SHEET_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leadId: lead.id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            city: lead.city,
            age: lead.age,
            purpose: lead.purpose,
            currentStatus: lead.currentStatus,
            bestTimeToReach: lead.bestTimeToReach,
            willingToAttendTraining: lead.willingToAttendTraining,
            assignedTo: "",
            createdAt: lead.createdAt,
          }),
        });

        console.log("Google Sheet Status:", response.status);

        const text = await response.text();

        console.log("Google Sheet Response:", text);
      } catch (err) {
        console.error("Google Sheet Error:", err);
      }
    }
    return NextResponse.json({
      success: true,

      message: "Lead created successfully.",

      data: lead,
    });
  } catch (error) {
    console.log("CREATE LEAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Something went wrong.",
      },

      {
        status: 500,
      },
    );
  }
}
