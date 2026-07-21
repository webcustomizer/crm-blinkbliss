import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export function withRateLimit(
  req: NextRequest,
  type: "api" | "login" | "form" = "api",
): NextResponse | null {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";

  if (!rateLimit(ip, type)) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down." },
      { status: 429 },
    );
  }
  return null;
}