type LeadRecord = any; // reuse your real Lead detail type if you have one

const cache = new Map<string, { data: LeadRecord; ts: number }>();
const inflight = new Map<string, Promise<LeadRecord>>();

const STALE_MS = 15_000; // treat as fresh for 15s; tune as needed

export function prefetchLead(leadId: string) {
  const cached = cache.get(leadId);
  if (cached && Date.now() - cached.ts < STALE_MS) return; // already fresh
  if (inflight.has(leadId)) return; // already fetching

  const p = fetch(`/api/salesperson/leads/${leadId}`, { cache: "no-store" })
    .then((res) => res.json())
    .then((data) => {
      if (data?.lead) cache.set(leadId, { data, ts: Date.now() });
      inflight.delete(leadId);
      return data;
    })
    .catch((err) => {
      inflight.delete(leadId);
      throw err;
    });

  inflight.set(leadId, p);
}

// Returns cached data instantly if fresh, otherwise waits on any inflight
// request, otherwise fetches fresh.
export async function getLeadCached(leadId: string) {
  const cached = cache.get(leadId);
  if (cached && Date.now() - cached.ts < STALE_MS) return cached.data;
  if (inflight.has(leadId)) return inflight.get(leadId)!;

  prefetchLead(leadId);
  return inflight.get(leadId)!;
}

export function invalidateLead(leadId: string) {
  cache.delete(leadId);
}
