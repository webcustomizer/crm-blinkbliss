import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // apna prisma client ka path yahan confirm/adjust karein
import { verifyToken } from "@/lib/auth";

const EXPORT_LABELS: Record<string, string> = {
  all: "All Leads",
  today: "Today's Leads",
  month: "This Month",
  status: "Export by Status",
  city: "Export by City",
  salesperson: "Export by Salesperson",
  dateRange: "Export by Date Range",
};

async function getAdminId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;

  try {
    const user = await verifyToken(token);
    if (!user || user.role !== "ADMIN") return null;

    // ⚠️ Agar JWT payload mein id ka field naam "id" ke ilawa kuch aur hai
    // (jaise "userId" ya "sub"), to yahan replace kar dein: user.userId ya user.sub
    return user.id ?? null;
  } catch {
    return null;
  }
}

function toCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(leads: any[]): string {
  const headers = [
    "Name",
    "Phone",
    "Email",
    "City",
    "Age",
    "Purpose",
    "Current Status",
    "Best Time To Reach",
    "Willing To Attend Training",
  ];

  const rows = leads.map((lead) => [
    lead.name,
    lead.phone,
    lead.email,
    lead.city,
    lead.age,
    lead.purpose,
    lead.currentStatus,
    lead.bestTimeToReach,
    lead.willingToAttendTraining === null ||
    lead.willingToAttendTraining === undefined
      ? ""
      : lead.willingToAttendTraining
        ? "Yes"
        : "No",
  ]);

  const lines = [
    headers.join(","),
    ...rows.map((r) => r.map(toCSVValue).join(",")),
  ];
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const adminId = await getAdminId(req);
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const type = searchParams.get("type") ?? "all";
  const status = searchParams.get("status");
  const city = searchParams.get("city");
  const salespersonId = searchParams.get("salespersonId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: any = {};

  if (type === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  if (type === "month") {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    where.createdAt = { gte: start, lte: end };
  }

  if (type === "status" && status) where.status = status;
  if (type === "city" && city)
    where.city = { equals: city, mode: "insensitive" };
  if (type === "salesperson" && salespersonId)
    where.assignedToId = salespersonId;

  if (type === "dateRange" && dateFrom && dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: new Date(dateFrom), lte: end };
  }

  try {
    const leads = await prisma.lead.findMany({
      where,
      select: {
        name: true,
        phone: true,
        email: true,
        city: true,
        age: true,
        purpose: true,
        currentStatus: true,
        bestTimeToReach: true,
        willingToAttendTraining: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const csv = generateCSV(leads);

    await prisma.exportLog.create({
      data: {
        type,
        label: EXPORT_LABELS[type] ?? "Leads",
        filters: { status, city, salespersonId, dateFrom, dateTo },
        recordCount: leads.length,
        exportedById: adminId,
      },
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-export-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error("Export leads error:", err);
    return NextResponse.json(
      { error: "Failed to export leads" },
      { status: 500 },
    );
  }
}
