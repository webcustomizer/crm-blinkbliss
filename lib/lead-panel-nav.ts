export function openLeadPanel(leadId: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("leadId", leadId);
  window.history.pushState(null, "", `?${params.toString()}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function closeLeadPanel(closedLeadId: string) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("leadId") !== closedLeadId) return;
  params.delete("leadId");
  window.history.replaceState(null, "", `?${params.toString()}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}