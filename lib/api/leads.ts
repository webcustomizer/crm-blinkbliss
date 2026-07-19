import { LeadFormData } from "@/types/lead";

export async function createLead(data: LeadFormData) {
  const response = await fetch("/api/admin/leads", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(data),
  });

  const text = await response.text();

  let result;

  try {
    result = JSON.parse(text);
  } catch {


    throw new Error("Server returned invalid response.");
  }

  if (!response.ok) {
    throw new Error(result.message || "Failed to create lead.");
  }

  return result;
}
