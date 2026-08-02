const prefetched = new Map<string, Promise<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function _fetch(url: string): Promise<unknown> {
  const cached = inflight.get(url);
  if (cached) return cached;
  const p = fetch(url, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}

export function prefetchRoute(url: string) {
  if (prefetched.has(url) || inflight.has(url)) return;
  const p = _fetch(url);
  prefetched.set(url, p);
}

export async function consumePrefetch<T = any>(url: string): Promise<T | null> {
  const p = prefetched.get(url);
  if (p) {
    prefetched.delete(url);
    try {
      return (await p) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export function prefetchSize() { return prefetched.size + inflight.size; }
