import { NextResponse } from "next/server";

export function handleAPIError(error: unknown, context: string): NextResponse {
  console.error(`[CRM Error] ${context}:`, error);
  if (typeof window !== "undefined") {
    try {
      const { toast } = require("sonner");
      toast.error("Something went wrong. Please try again.");
    } catch {}
  }
  return NextResponse.json(
    { message: "Something went wrong" },
    { status: 500 },
  );
}
