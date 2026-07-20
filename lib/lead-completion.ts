export function checkLeadCompletion(data: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  age?: number | null;
  purpose?: string | null;
  currentStatus?: string | null;
  bestTimeToReach?: string | null;
  willingToAttendTraining?: boolean | null;
}) {
  const fields = [
    data.phone, data.name, data.email, data.city, data.age,
    data.purpose, data.currentStatus, data.bestTimeToReach, data.willingToAttendTraining,
  ];
  const allFilled = fields.every((f) => f !== null && f !== undefined && f !== "");
  return allFilled ? "COMPLETE" as const : "INCOMPLETE" as const;
}
