type LeadRecord = any;

const cache = new Map<string, { data: LeadRecord; ts: number }>();
const inflight = new Map<string, Promise<LeadRecord>>();

const STALE_MS = 15_000;

export function prefetchTlLead(leadId: string) {
  const cached = cache.get(leadId);
  if (cached && Date.now() - cached.ts < STALE_MS) return;
  if (inflight.has(leadId)) return;

  const p = fetch(`/api/team-leader/leads/${leadId}`, { cache: "no-store" })
    .then((res) => res.json())
    .then((data) => {
      if (data?.data) cache.set(leadId, { data, ts: Date.now() });
      inflight.delete(leadId);
      return data;
    })
    .catch((err) => {
      inflight.delete(leadId);
      throw err;
    });

  inflight.set(leadId, p);
}

export async function getTlLeadCached(leadId: string) {
  const cached = cache.get(leadId);
  if (cached && Date.now() - cached.ts < STALE_MS) return cached.data;
  if (inflight.has(leadId)) return inflight.get(leadId)!;

  prefetchTlLead(leadId);
  return inflight.get(leadId)!;
}

export function getTlLeadFromCacheSync(leadId: string): LeadRecord | null {
  const cached = cache.get(leadId);
  if (cached && Date.now() - cached.ts < STALE_MS) return cached.data;
  return null;
}

export function invalidateTlLead(leadId: string) {
  cache.delete(leadId);
}
