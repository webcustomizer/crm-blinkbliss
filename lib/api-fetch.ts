export async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", ...options });
  if (res.status === 401) {
    try { await fetch("/api/logout", { method: "POST" }); } catch {}
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  return res;
}
