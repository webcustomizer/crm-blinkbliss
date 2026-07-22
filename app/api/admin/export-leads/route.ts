import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import * as XLSX from "xlsx";

const EXPORT_LABELS: Record<string, string> = {
  all: "All Leads",
  today: "Today's Leads",
  month: "This Month",
  status: "Export by Status",
  city: "Export by City",
  salesperson: "Export by Salesperson",
  dateRange: "Export by Date Range",
};

function generateXLSX(leads: any[]): Buffer {
  const rows = leads.map((lead) => ({
    Name: lead.name || "",
    Phone: lead.phone || "",
    Email: lead.email || "",
    City: lead.city || "",
    Age: lead.age ?? "",
    Purpose: lead.purpose || "",
    "Current Status": lead.currentStatus || "",
    "Best Time To Reach": lead.bestTimeToReach || "",
    "Willing To Attend Training":
      lead.willingToAttendTraining === null ||
      lead.willingToAttendTraining === undefined
        ? ""
        : lead.willingToAttendTraining
        ? "Yes"
        : "No",
    Source: lead.source || "",
    "Lead Status": lead.status || "",
    "Assigned To": lead.assignedTo?.name || "",
    "Created At": lead.createdAt
      ? new Date(lead.createdAt).toLocaleDateString("en-US")
      : "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = [
    { wch: 25 }, // Name
    { wch: 18 }, // Phone
    { wch: 30 }, // Email
    { wch: 20 }, // City
    { wch: 8 }, // Age
    { wch: 25 }, // Purpose
    { wch: 20 }, // Current Status
    { wch: 20 }, // Best Time To Reach
    { wch: 22 }, // Willing To Attend Training
    { wch: 18 }, // Source
    { wch: 18 }, // Lead Status
    { wch: 20 }, // Assigned To
    { wch: 15 }, // Created At
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  );
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;
  const adminId = auth.user.id;

  const { searchParams } = new URL(req.url);

  const type = searchParams.get("type") ?? "all";
  const format = searchParams.get("format") ?? "xlsx"; // xlsx or csv
  const status = searchParams.get("status");
  const city = searchParams.get("city");
  const salespersonId = searchParams.get("salespersonId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: any = { isDeleted: false };

  if (type === "today") {
    const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
    const pktNow = new Date(Date.now() + PKT_OFFSET_MS);
    const year = pktNow.getUTCFullYear();
    const month = pktNow.getUTCMonth();
    const day = pktNow.getUTCDate();
    const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - PKT_OFFSET_MS);
    const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - PKT_OFFSET_MS);
    where.createdAt = { gte: start, lte: end };
  }

  if (type === "month") {
    const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
    const pktNow = new Date(Date.now() + PKT_OFFSET_MS);
    const year = pktNow.getUTCFullYear();
    const month = pktNow.getUTCMonth();
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - PKT_OFFSET_MS);
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999) - PKT_OFFSET_MS);
    where.createdAt = { gte: start, lte: end };
  }

  if (type === "status" && status) where.status = status;
  if (type === "city" && city)
    where.city = { equals: city, mode: "insensitive" };
  if (type === "salesperson" && salespersonId)
    where.assignedToId = salespersonId;

  if (type === "dateRange" && dateFrom && dateTo) {
    // Use PKT-aware end-of-day (23:59:59.999 PKT) so the full
    // "to" date is included — naive `new Date(dateTo)` truncates
    // at midnight UTC which is 5 hours before midnight PKT.
    const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
    const toDate = new Date(dateTo);
    const pktToDate = new Date(toDate.getTime() + PKT_OFFSET_MS);
    const year = pktToDate.getUTCFullYear();
    const month = pktToDate.getUTCMonth();
    const day = pktToDate.getUTCDate();
    const endOfDayPKT = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - PKT_OFFSET_MS);
    where.createdAt = { gte: new Date(dateFrom), lte: endOfDayPKT };
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
        source: true,
        status: true,
        createdAt: true,
        assignedTo: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    await prisma.exportLog.create({
      data: {
        type,
        label: EXPORT_LABELS[type] ?? "Leads",
        filters: { status, city, salespersonId, dateFrom, dateTo },
        recordCount: leads.length,
        exportedById: adminId,
      },
    });

    if (format === "csv") {
      // CSV fallback with BOM for Excel
      const BOM = "\uFEFF";
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
        "Source",
        "Lead Status",
        "Assigned To",
        "Created At",
      ];

      function toCSVValue(value: unknown): string {
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }

      const headerLine = headers.map(toCSVValue).join(",");
      const rowLines = leads.map((lead) => {
        const row = [
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
          lead.source || "",
          lead.status || "",
          lead.assignedTo?.name || "",
          lead.createdAt
            ? new Date(lead.createdAt).toLocaleDateString("en-US")
            : "",
        ];
        return row.map(toCSVValue).join(",");
      });

      const csv = BOM + [headerLine, ...rowLines].join("\r\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="leads-export-${Date.now()}.csv"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // Default: XLSX format
    const xlsxBuffer = generateXLSX(leads);
    const xlsxBody = new Uint8Array(xlsxBuffer);

    return new NextResponse(xlsxBody, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="leads-export-${Date.now()}.xlsx"`,
        "Content-Length": String(xlsxBuffer.length),
        "Cache-Control": "no-cache, no-store, must-revalidate",
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
