import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextAutoAssignee } from "@/lib/auto-assign";

const GOOGLE_SHEET_WEBHOOK = process.env.GOOGLE_SHEET_WEBHOOK;

// Complete incomplete helper
function checkLeadCompletion(data: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  age?: number | null;
  purpose?: string | null;
  currentStatus?: string | null;
  bestTimeToReach?: string | null;
  willingToAttendTraining?: boolean | null;
}) {
  const fields = [
    data.phone,
    data.name,
    data.email,
    data.city,
    data.age,
    data.purpose,
    data.currentStatus,
    data.bestTimeToReach,
    data.willingToAttendTraining,
  ];

  const allFilled = fields.every(
    (field) => field !== null && field !== undefined && field !== "",
  );

  return allFilled ? "COMPLETE" : "INCOMPLETE";
}

// Pakistan Standard Time = UTC+5
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

function getPKTDayBoundary(daysOffset: number, endOfDay: boolean) {
  const pktNow = new Date(Date.now() + PKT_OFFSET_MS);

  const year = pktNow.getUTCFullYear();
  const month = pktNow.getUTCMonth();
  const day = pktNow.getUTCDate() + daysOffset;

  const boundaryInPKT = endOfDay
    ? new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
    : new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

  // Convert PKT boundary back to UTC for Prisma
  return new Date(boundaryInPKT.getTime() - PKT_OFFSET_MS);
}

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
        const start = getPKTDayBoundary(0, false);
        const end = getPKTDayBoundary(0, true);

        where.nextFollowUp = {
          gte: start,
          lte: end,
        };

        where.status = {
          notIn: ["JOINED", "DEAD"],
        };
      } else if (filter === "OVERDUE_FOLLOW_UP") {
        const todayStart = getPKTDayBoundary(0, false);

        where.nextFollowUp = {
          lt: todayStart,
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

    // 👇 Automation check — agar toggle ON hai to next salesperson mil jayega
    const autoAssignedId = await getNextAutoAssignee();

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

        completion: checkLeadCompletion({
          name,
          phone,
          email,
          city,
          age: age ? Number(age) : null,
          purpose,
          currentStatus,
          bestTimeToReach,
          willingToAttendTraining,
        }),

        remarks: null,

        assignedToId: autoAssignedId, // 👈 naya field
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
            assignedTo: autoAssignedId ?? "", // 👈 ab actual value jayegi
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
