-- Add composite index on (assignedToId, nextFollowUp) for dashboard follow-up
-- COUNT queries (overdue, today, upcoming) which filter by both columns.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_assigned_to_next_follow_up
  ON "Lead" ("assignedToId", "nextFollowUp");
