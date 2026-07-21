import { toast } from "sonner";

export function handleAPIError(error: unknown, context: string) {
  console.error(`[CRM Error] ${context}:`, error);
  toast.error("Something went wrong. Please try again.");
}
