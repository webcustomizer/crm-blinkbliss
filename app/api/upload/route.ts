import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { randomBytes } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const BUCKET = "uploads";
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN", "SALESPERSON"]);
  if ("error" in auth) return auth.error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "File too large. Max 10MB." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, message: "File type not allowed." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "bin";
    const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
    const path = `${auth.user.id}/${Date.now()}_${randomBytes(8).toString("hex")}_${safeName}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("[UPLOAD] Supabase Storage error:", uploadError.message);
      return NextResponse.json({ success: false, message: "Upload failed." }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const fileUrl = urlData.publicUrl;

    const uploaded = await prisma.uploadedFile.create({
      data: {
        userId: auth.user.id,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: uploaded.id,
        fileName: uploaded.fileName,
        fileUrl: uploaded.fileUrl,
        fileSize: uploaded.fileSize,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Upload failed." }, { status: 500 });
  }
}
