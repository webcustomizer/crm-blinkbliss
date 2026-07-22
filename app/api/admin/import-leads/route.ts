import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { checkLeadCompletion } from "@/lib/lead-completion";
import { getNextAutoAssignee } from "@/lib/auto-assign";

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
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

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
        isDeleted: false,
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

    // Step 4: Auto-assign logic — use shared transactional round-robin
    const settings = await prisma.cRMSetting.findFirst();
    const autoAssignEnabled = settings?.autoAssignEnabled ?? false;

    let assignedToIds: (string | null)[] = newRows.map(() => null);
    let autoAssignedCount = 0;

    if (autoAssignEnabled) {
      for (let i = 0; i < newRows.length; i++) {
        const assigneeId = await getNextAutoAssignee();
        if (assigneeId) {
          assignedToIds[i] = assigneeId;
          autoAssignedCount++;
        }
      }
    }

    // Step 5: Bulk insert
    const dataToInsert = newRows.map((row, i) => {
      const age = parseAge(row.Age);
      const willingToAttendTraining = parseBoolean(row["Willing To Attend Training"]);
      return {
        name: row.Name?.trim() || null,
        phone: row.Phone!.trim(),
        email: row.Email?.trim() || null,
        city: row.City?.trim() || null,
        age,
        purpose: row.Purpose?.trim() || null,
        currentStatus: row["Current Status"]?.trim() || null,
        bestTimeToReach: row["Best Time To Reach"]?.trim() || null,
        willingToAttendTraining,
        source: row.Source?.trim().toLowerCase() || null,
        completion: checkLeadCompletion({
          name: row.Name?.trim() || null,
          phone: row.Phone!.trim(),
          email: row.Email?.trim() || null,
          city: row.City?.trim() || null,
          age,
          purpose: row.Purpose?.trim() || null,
          currentStatus: row["Current Status"]?.trim() || null,
          bestTimeToReach: row["Best Time To Reach"]?.trim() || null,
          willingToAttendTraining,
        }),
        assignedToId: assignedToIds[i],
      };
    });

    const result = await prisma.lead.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

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
