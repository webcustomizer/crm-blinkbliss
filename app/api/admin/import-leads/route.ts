import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

async function getAdminId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;

  try {
    const user = await verifyToken(token);
    if (!user || user.role !== "ADMIN") return null;
    return user.id ?? null;
  } catch {
    return null;
  }
}

type CSVRow = {
  Name?: string;
  Phone?: string;
  Email?: string;
  City?: string;
  Age?: string;
  Purpose?: string;
  "Current Status"?: string;
  "Best Time To Reach"?: string;
  "Willing To Attend Training"?: string;
  Source?: string;
};

function parseBoolean(value?: string): boolean | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (["yes", "true", "1"].includes(v)) return true;
  if (["no", "false", "0"].includes(v)) return false;
  return null;
}

function parseAge(value?: string): number | null {
  if (!value) return null;
  const n = parseInt(value.trim(), 10);
  return isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
  const adminId = await getAdminId(req);
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rows: CSVRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV mein koi data nahi mila" },
        { status: 400 },
      );
    }

    // Step 1: Basic validation — phone required
    const validRows: CSVRow[] = [];
    let skippedInvalid = 0;

    for (const row of rows) {
      const phone = row.Phone?.trim();
      if (!phone) {
        skippedInvalid++;
        continue;
      }
      validRows.push(row);
    }

    // Step 2: Deduplicate within the CSV itself (keep first occurrence)
    // — checks both phone AND email
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    const dedupedRows: CSVRow[] = [];
    let skippedDuplicateInFile = 0;

    for (const row of validRows) {
      const phone = row.Phone!.trim();
      const email = row.Email?.trim().toLowerCase() || null;

      const isDuplicatePhone = seenPhones.has(phone);
      const isDuplicateEmail = email ? seenEmails.has(email) : false;

      if (isDuplicatePhone || isDuplicateEmail) {
        skippedDuplicateInFile++;
        continue;
      }

      seenPhones.add(phone);
      if (email) seenEmails.add(email);
      dedupedRows.push(row);
    }

    // Step 3: Check which phones/emails already exist in DB
    const phonesToCheck = dedupedRows.map((r) => r.Phone!.trim());
    const emailsToCheck = dedupedRows
      .map((r) => r.Email?.trim().toLowerCase())
      .filter((e): e is string => !!e);

    const existingLeads = await prisma.lead.findMany({
      where: {
        OR: [
          { phone: { in: phonesToCheck } },
          ...(emailsToCheck.length > 0
            ? [{ email: { in: emailsToCheck } }]
            : []),
        ],
      },
      select: { phone: true, email: true },
    });

    const existingPhoneSet = new Set(existingLeads.map((l) => l.phone));
    const existingEmailSet = new Set(
      existingLeads
        .map((l) => l.email?.toLowerCase())
        .filter((e): e is string => !!e),
    );

    const newRows = dedupedRows.filter((r) => {
      const phone = r.Phone!.trim();
      const email = r.Email?.trim().toLowerCase();

      const isDuplicatePhone = existingPhoneSet.has(phone);
      const isDuplicateEmail = email ? existingEmailSet.has(email) : false;

      return !isDuplicatePhone && !isDuplicateEmail;
    });

    const skippedDuplicateInDb = dedupedRows.length - newRows.length;

    if (newRows.length === 0) {
      return NextResponse.json({
        totalRows: rows.length,
        inserted: 0,
        skippedDuplicate: skippedDuplicateInFile + skippedDuplicateInDb,
        skippedInvalid,
        autoAssigned: 0,
      });
    }

    // Step 4: Auto-assign logic (round-robin) — agar setting ON hai
    const settings = await prisma.cRMSetting.findFirst();
    const autoAssignEnabled = settings?.autoAssignEnabled ?? false;

    let assignedToIds: (string | null)[] = newRows.map(() => null);
    let autoAssignedCount = 0;
    let newLastAssignedId: string | null =
      settings?.lastAssignedSalespersonId ?? null;

    if (autoAssignEnabled) {
      const salespeople = await prisma.user.findMany({
        where: { role: "SALESPERSON", isActive: true },
        select: { id: true },
        orderBy: { name: "asc" },
      });

      if (salespeople.length > 0) {
        // Pichli baar jahan chhoda tha, wahan se next salesperson se continue karein
        let startIndex = 0;
        if (settings?.lastAssignedSalespersonId) {
          const lastIndex = salespeople.findIndex(
            (sp) => sp.id === settings.lastAssignedSalespersonId,
          );
          startIndex =
            lastIndex === -1 ? 0 : (lastIndex + 1) % salespeople.length;
        }

        assignedToIds = newRows.map((_, i) => {
          const salesperson =
            salespeople[(startIndex + i) % salespeople.length];
          return salesperson.id;
        });

        autoAssignedCount = assignedToIds.filter(Boolean).length;
        newLastAssignedId = assignedToIds[assignedToIds.length - 1];
      }
    }

    // Step 5: Bulk insert
    const dataToInsert = newRows.map((row, i) => ({
      name: row.Name?.trim() || null,
      phone: row.Phone!.trim(),
      email: row.Email?.trim() || null,
      city: row.City?.trim() || null,
      age: parseAge(row.Age),
      purpose: row.Purpose?.trim() || null,
      currentStatus: row["Current Status"]?.trim() || null,
      bestTimeToReach: row["Best Time To Reach"]?.trim() || null,
      willingToAttendTraining: parseBoolean(row["Willing To Attend Training"]),
      source: row.Source?.trim().toLowerCase() || null,
      assignedToId: assignedToIds[i],
    }));

    const result = await prisma.lead.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    // Step 6: Round-robin pointer save karein taake agli import se continue ho
    if (autoAssignEnabled && settings && newLastAssignedId) {
      await prisma.cRMSetting.update({
        where: { id: settings.id },
        data: { lastAssignedSalespersonId: newLastAssignedId },
      });
    }

    return NextResponse.json({
      totalRows: rows.length,
      inserted: result.count,
      skippedDuplicate: skippedDuplicateInFile + skippedDuplicateInDb,
      skippedInvalid,
      autoAssigned: autoAssignEnabled ? autoAssignedCount : 0,
    });
  } catch (err) {
    console.error("Import leads error:", err);
    return NextResponse.json(
      { error: "Failed to import leads" },
      { status: 500 },
    );
  }
}
