"use client";

import { ExternalLink } from "lucide-react";

interface MentionTextProps {
  content: string;
  lead?: { id: string; name: string | null; phone: string } | null;
  leadPath?: string;
}

export default function MentionText({ content, lead, leadPath }: MentionTextProps) {
  if (!lead) {
    return <>{content}</>;
  }

  const leadName = lead.name || lead.phone;
  const idx = content.indexOf(`@${leadName}`);
  if (idx === -1) {
    return <>{content}</>;
  }

  const before = content.slice(0, idx);
  const mention = content.slice(idx, idx + leadName.length + 1);
  const after = content.slice(idx + leadName.length + 1);

  const href = leadPath
    ? `${leadPath}?leadId=${lead.id}`
    : `/admin/leads?leadId=${lead.id}`;

  return (
    <>
      {before}
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-0.5 text-blue-400 hover:text-blue-300 font-medium bg-blue-500/10 rounded px-1 -mx-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        {mention}
        <ExternalLink size={10} className="opacity-60" />
      </a>
      {after}
    </>
  );
}
