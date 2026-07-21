import { NextResponse } from "next/server";
import { toast } from "sonner";

export function handleAPIError(error: unknown, context: string): NextResponse {
  console.error(`[CRM Error] ${context}:`, error);
  toast.error("Something went wrong. Please try again.");
  return NextResponse.json(
    { message: "Something went wrong" },
    { status: 500 },
  );
}
