"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";

export default function MessagesPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/team-leader/messages/contacts").then((r) => r.json()).then((j) => {
      if (j.success) setContacts(j.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeContact) return;
    fetch(`/api/team-leader/messages?contactId=${activeContact.id}`).then((r) => r.json()).then((j) => {
      if (j.success) setMessages(j.data);
    });
  }, [activeContact]);

  async function send() {
    if (!content.trim() || !activeContact) return;
    const r = await fetch("/api/team-leader/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, receiverId: activeContact.id }),
    });
    const j = await r.json();
    if (j.success) { setContent(""); setMessages((prev) => [...prev, j.data]); }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      <div className="w-48 shrink-0 space-y-1 overflow-y-auto">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5 rounded-xl px-3 py-2">
              <div className="h-3.5 w-24 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="h-2.5 w-16 animate-pulse rounded-lg bg-white/[0.04]" />
            </div>
          ))
        ) : contacts.map((c: any) => (
          <button key={c.id} onClick={() => setActiveContact(c)}
            className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-all ${
              activeContact?.id === c.id ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "text-zinc-400 hover:bg-white/5"
            }`}
          >
            <p className="font-medium truncate">{c.name}</p>
            <p className="text-[10px] text-zinc-500">{c.role}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col rounded-xl border border-[#D4AF37]/20 bg-[#171717]">
        {activeContact ? (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m: any) => (
                <div key={m.id} className={`flex ${m.senderId === activeContact.id ? "" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    m.senderId === activeContact.id ? "bg-zinc-800 text-zinc-200" : "bg-[#D4AF37]/20 text-[#D4AF37]"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-[#D4AF37]/20 p-3">
              <input value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-[#D4AF37]/20 bg-black/30 px-3 py-2 text-sm text-white outline-none"
              />
              <button onClick={send} className="rounded-lg bg-[#D4AF37] p-2 text-black">
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Select a contact</div>
        )}
      </div>
    </div>
  );
}