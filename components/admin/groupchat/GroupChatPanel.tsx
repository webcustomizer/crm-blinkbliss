"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Send,
  AtSign,
  X,
  ExternalLink,
  Users,
  ShieldAlert,
  Paperclip,
  Check,
  CheckCheck,
  ChevronUp,
  Trash2,
} from "lucide-react";
import type { GroupChatMessage, MentionLead } from "@/types/lead";
import { subscribeToGroupMessages, subscribeToTyping } from "@/lib/realtime";
import ChatImage, { isImageFile } from "@/components/chat/ChatImage";
import ImagePreview from "@/components/chat/ImagePreview";

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export default function GroupChatPanel({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [users, setUsers] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [mentionedLead, setMentionedLead] = useState<MentionLead | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionLead[]>([]);
  const [showMentionSearch, setShowMentionSearch] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<{
    sendTyping: (b: boolean, n: string) => void;
  } | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typingRemovalTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  const isFetchingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  // Distinguish "just sent/received a message → autoscroll" from
  // "loaded older messages → do NOT autoscroll, preserve position"
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "instant" });
      });
    }
  }, [messages]);

  // ---- Initial load: only the latest page ----
  const fetchMessages = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await fetch("/api/admin/group-chat", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) {
        setDisabled(true);
        return;
      }
      setDisabled(false);
      if (json.data) {
        shouldAutoScrollRef.current = true;
        setMessages(json.data);
      }
      setHasMore(Boolean(json.hasMore));
      if (json.users) setUsers(json.users);
      setLoading(false);
      initialLoadDoneRef.current = true;
    } catch {
      // swallow — keep previous state on transient errors
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Load an older page when the user scrolls near the top.
  // Preserves scroll position by measuring scrollHeight before/after prepend.
  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || !hasMore || isFetchingRef.current) return;
    if (messages.length === 0) return;
    const oldest = messages[0];

    setLoadingMore(true);
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    try {
      const res = await fetch(
        `/api/admin/group-chat?cursor=${encodeURIComponent(oldest.id)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (json.success && json.data) {
        shouldAutoScrollRef.current = false; // don't jump to bottom
        setMessages((prev) => [...json.data, ...prev]);
        setHasMore(Boolean(json.hasMore));

        // Restore scroll position so the view doesn't jump after prepending
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }
    } catch {
      // ignore transient errors, user can retry by scrolling again
    } finally {
      setLoadingMore(false);
    }
  }, [messages, hasMore, loadingMore]);

  function onMessagesScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 120) {
      loadOlderMessages();
    }
  }

  // ---- Supabase Realtime: subscribe to new group messages ----
  // Appends the broadcasted message directly instead of refetching the
  // whole list. broadcastNewGroupMessage() already sends the full message
  // payload, so no round-trip is needed here.
  useEffect(() => {
    const unsub = subscribeToGroupMessages((incoming: GroupChatMessage) => {
      if (!incoming?.id) {
        // Defensive fallback in case a caller ever broadcasts without a payload
        fetchMessages();
        return;
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        shouldAutoScrollRef.current = true;
        return [...prev, incoming];
      });
    });
    return () => unsub();
  }, [fetchMessages]);

  // ---- Supabase Realtime: typing broadcast ----
  useEffect(() => {
    const { unsubscribe, sendTyping } = subscribeToTyping(
      "group:chat",
      (payload) => {
        const timers = typingRemovalTimersRef.current;
        const existing = timers.get(payload.name);
        if (existing) {
          clearTimeout(existing);
          timers.delete(payload.name);
        }

        if (payload.isTyping && Date.now() - payload.ts < 5000) {
          setTypingNames((prev) =>
            prev.includes(payload.name) ? prev : [...prev, payload.name],
          );

          const timer = setTimeout(() => {
            setTypingNames((prev) => prev.filter((n) => n !== payload.name));
            timers.delete(payload.name);
          }, 5000);
          timers.set(payload.name, timer);
        } else {
          setTypingNames((prev) => prev.filter((n) => n !== payload.name));
        }
      },
    );

    typingRef.current = { sendTyping };

    return () => {
      unsubscribe();
      typingRemovalTimersRef.current.forEach((t) => clearTimeout(t));
      typingRemovalTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    fetchMessages();
    // Mark ALL unread group messages as read on page open
    fetch("/api/admin/group-chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark read — sirf woh messages jo current user ne khud read nahi kiye
  useEffect(() => {
    if (messages.length === 0 || !currentUserId) return;
    const unread = messages
      .filter(
        (m) =>
          m.senderId !== currentUserId &&
          !m.reads?.some((r) => r.userId === currentUserId),
      )
      .map((m) => m.id);
    if (unread.length === 0) return;
    fetch("/api/admin/group-chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: unread }),
    }).catch(() => {});
  }, [messages, currentUserId]);

  const myName = users.find((u) => u.id === currentUserId)?.name || "Admin";

  function onInputChange(val: string) {
    setNewMsg(val);
    if (typingRef.current) {
      typingRef.current.sendTyping(val.length > 0, myName);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        typingRef.current?.sendTyping(false, myName);
      }, 3000);
    }

    const atIdx = val.lastIndexOf("@");
    const isValidMentionStart =
      atIdx !== -1 && (atIdx === 0 || /\s/.test(val[atIdx - 1]));
    const noSpaceAfterAt = atIdx !== -1 && !val.slice(atIdx + 1).includes(" ");

    if (isValidMentionStart && noSpaceAfterAt) {
      setShowMentionSearch(true);
      if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
      mentionTimerRef.current = setTimeout(async () => {
        try {
          const r = await fetch(
            `/api/admin/messages?query=${encodeURIComponent(
              val.slice(atIdx + 1),
            )}`,
            { cache: "no-store" },
          );
          const j = await r.json();
          if (j.leads) setMentionResults(j.leads.slice(0, 5));
        } catch {}
      }, 100);
      return;
    }
    setShowMentionSearch(false);
  }

  function selectMentionLead(lead: MentionLead) {
    setNewMsg(
      (prev) =>
        prev.slice(0, prev.lastIndexOf("@")) + `@${lead.name || lead.phone} `,
    );
    setMentionedLead(lead);
    setShowMentionSearch(false);
    setMentionResults([]);
    inputRef.current?.focus();
  }

  async function deleteAllMessages() {
    if (!confirm("Delete all group chat messages? This cannot be undone.")) return;
    try {
      const r = await fetch("/api/admin/group-chat", {
        method: "DELETE",
      });
      const j = await r.json();
      if (j.success) {
        setMessages([]);
        toast.success("All messages cleared.");
      } else {
        toast.error(j.message);
      }
    } catch {
      toast.error("Failed to clear messages.");
    }
  }

  async function sendMessage() {
    if (!newMsg.trim()) return;
    const content = newMsg.trim();
    const leadId = mentionedLead?.id || null;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tempMsg: GroupChatMessage & { _sending?: boolean } = {
      id: tempId,
      content,
      senderId: currentUserId,
      leadId,
      fileUrl: null,
      fileName: null,
      fileSize: null,
      createdAt: new Date().toISOString(),
      _sending: true,
      sender: users.find((u) => u.id === currentUserId),
      lead: mentionedLead ? { id: mentionedLead.id, name: mentionedLead.name, phone: mentionedLead.phone } : undefined,
    };
    setNewMsg("");
    setMentionedLead(null);
    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/admin/group-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, leadId }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...json.data } : m));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(json.message);
        setNewMsg(content);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Failed.");
      setNewMsg(content);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      await doUploadAndSend(file, "");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function doUploadAndSend(file: File, caption: string) {
    setFileUploading(true);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const blobUrl = URL.createObjectURL(file);
    const tempMsg: GroupChatMessage & { _sending?: boolean } = {
      id: tempId,
      content: caption || file.name,
      senderId: currentUserId,
      leadId: mentionedLead?.id || null,
      fileUrl: blobUrl,
      fileName: file.name,
      fileSize: file.size,
      createdAt: new Date().toISOString(),
      _sending: true,
      sender: users.find((u) => u.id === currentUserId),
    };
    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const u = await fetch("/api/upload", { method: "POST", body: fd });
      const uj = await u.json();
      if (uj.success) {
        const content = caption || `📎 ${uj.data.fileName}`;
        const m = await fetch("/api/admin/group-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            leadId: mentionedLead?.id || null,
            fileUrl: uj.data.fileUrl,
            fileName: uj.data.fileName,
            fileSize: uj.data.fileSize,
          }),
        });
        const mj = await m.json();
        if (mj.success) {
          URL.revokeObjectURL(blobUrl);
          setMessages((prev) => prev.map((msg) => msg.id === tempId ? { ...mj.data } : msg));
        } else {
          URL.revokeObjectURL(blobUrl);
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
          toast.error("Send failed.");
        }
      } else {
        URL.revokeObjectURL(blobUrl);
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        toast.error("Upload failed.");
      }
    } catch {
      URL.revokeObjectURL(blobUrl);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      toast.error("Upload failed.");
    }
    setFileUploading(false);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setPreviewFile(file);
          setPreviewUrl(URL.createObjectURL(file));
        }
        return;
      }
    }
  }

  if (disabled) {
    return (
      <div className="rounded-xl sm:rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-6 sm:p-12 text-center">
        <ShieldAlert
          size={36}
          className="mx-auto text-red-400/60 mb-3 sm:mb-4"
        />
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
          Group Chat Disabled
        </h2>
        <p className="text-gray-400 text-sm">
          Enable it from Settings → Communication.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 rounded-xl sm:rounded-[28px] border border-[#D4AF37]/20 bg-[#0b0b0b] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
      {previewFile && previewUrl && (
        <ImagePreview
          file={previewFile}
          previewUrl={previewUrl}
          sending={fileUploading}
          onSend={(caption) => {
            if (previewFile) doUploadAndSend(previewFile, caption);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewFile(null);
            setPreviewUrl(null);
          }}
          onCancel={() => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewFile(null);
            setPreviewUrl(null);
          }}
        />
      )}
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-white/10 flex items-center gap-2 sm:gap-3 shrink-0 bg-gradient-to-r from-[#171717] to-[#111111] z-10">
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <Users size={16} className="sm:size-[18px]" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-white text-xs sm:text-sm truncate">
            Team Chat
          </h2>
          <p className="text-[10px] sm:text-xs text-gray-400 truncate">
            {users.length} members
          </p>
        </div>
        <button
          onClick={deleteAllMessages}
          title="Clear all messages"
          className="ml-auto shrink-0 rounded-lg border border-white/10 p-2 text-white/30 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={onMessagesScroll}
        onPaste={handlePaste}
        className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-3 sm:py-4 space-y-1"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(212,175,55,0.05) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          backgroundColor: "#0b0b0b",
        }}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-start justify-center pt-8 h-full text-white/40 text-center">
            <div>
              <p className="text-base sm:text-lg">Welcome to Team Chat! 👋</p>
              <p className="text-[11px] sm:text-sm mt-1">
                Type @ to mention a lead
              </p>
            </div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center py-2">
                {loadingMore ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
                ) : (
                  <button
                    onClick={loadOlderMessages}
                    className="flex items-center gap-1 text-[10px] sm:text-xs text-white/40 hover:text-[#D4AF37] px-3 py-1 rounded-full border border-white/10"
                  >
                    <ChevronUp size={12} />
                    Load older messages
                  </button>
                )}
              </div>
            )}

            {messages.map((msg, idx) => {
              const isOwn = msg.senderId === currentUserId;
              const prevSame =
                idx > 0 &&
                messages[idx - 1].senderId === msg.senderId &&
                formatDateLabel(messages[idx - 1].createdAt) ===
                  formatDateLabel(msg.createdAt);
              const isAdmin =
                users.find((u) => u.id === msg.senderId)?.role === "ADMIN";

              const dateLabel = formatDateLabel(msg.createdAt);
              const showDateSeparator =
                idx === 0 ||
                dateLabel !== formatDateLabel(messages[idx - 1].createdAt);

              const isRead = (msg.reads?.length ?? 0) > 0;

              return (
                <div key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-3">
                      <span className="text-[10px] sm:text-[11px] text-white/50 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                        {dateLabel}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex ${
                      isOwn ? "justify-end" : "justify-start"
                    } ${prevSame ? "mt-0.5" : "mt-2"}`}
                  >
                    <div className="max-w-[82%] sm:max-w-[65%]">
                      {!prevSame && !isOwn && (
                        <p className="text-[10px] sm:text-xs mb-0.5 px-1 font-medium flex items-center gap-1.5">
                          <span className="text-[#D4AF37]/70">
                            {msg.sender?.name || "Unknown"}
                          </span>
                          {isAdmin && (
                            <span className="text-[9px] text-red-400 bg-red-400/10 rounded-full px-1.5 py-px font-bold border border-red-400/20">
                              Admin
                            </span>
                          )}
                        </p>
                      )}
                      <div
                        className={`px-3 py-2 sm:px-3.5 sm:py-2 text-xs sm:text-sm shadow-sm overflow-hidden ${
                          isOwn
                            ? "bg-emerald-600/25 text-white border border-emerald-500/25 rounded-2xl rounded-br-sm"
                            : "bg-white/[0.06] text-white/85 border border-white/10 rounded-2xl rounded-bl-sm"
                        }`}
                      >
                        <p className="break-words whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>

                        {msg.fileUrl && isImageFile(msg.fileName) ? (
                          <ChatImage src={msg.fileUrl} alt={msg.fileName || "Image"} fileName={msg.fileName} />
                        ) : msg.fileUrl ? (
                          <a
                            href={msg.fileUrl}
                            download={msg.fileName}
                            target="_blank"
                            rel="noopener"
                            className="mt-1.5 sm:mt-2 flex items-center gap-1.5 rounded-lg bg-black/20 border border-white/10 px-2 py-1.5 text-[10px] sm:text-xs text-blue-300 hover:bg-black/30 w-fit"
                          >
                            <Paperclip size={12} />
                            <span className="truncate max-w-[160px]">
                              {msg.fileName || "Download"}
                            </span>
                          </a>
                        ) : null}

                        {msg.lead && (
                          <a
                            href={`/admin/leads?leadId=${msg.lead.id}`}
                            target="_blank"
                            rel="noopener"
                            className="mt-1.5 sm:mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-500/15 border border-blue-500/25 px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs text-blue-300 hover:bg-blue-500/25"
                          >
                            <ExternalLink size={10} />
                            <span className="font-medium truncate">
                              {msg.lead.name || msg.lead.phone}
                            </span>
                          </a>
                        )}

                        <div className="flex items-center justify-end gap-0.5 mt-1 -mb-0.5">
                          {(msg as any)._sending && (
                            <span className="h-2.5 w-2.5 block animate-spin rounded-full border border-white/40 border-t-white/80" />
                          )}
                          <span className="text-[9px] text-white/40 leading-none">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isOwn &&
                            (isRead ? (
                              <CheckCheck size={12} className="text-sky-400" />
                            ) : (
                              <Check size={12} className="text-white/40" />
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={chatEndRef} />
      </div>

      {typingNames.filter((n) => n !== myName).length > 0 && (
        <div className="px-3 sm:px-4 py-1 shrink-0">
          <p className="text-[10px] sm:text-xs text-emerald-400/70 italic animate-pulse">
            {typingNames.filter((n) => n !== myName).slice(0, 3).join(", ")} typing...
          </p>
        </div>
      )}

      {/* Mention badge */}
      {mentionedLead && (
        <div className="mx-3 sm:mx-4 mt-1 flex items-center gap-1.5 rounded-xl bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 shrink-0">
          <AtSign size={12} className="text-blue-400" />
          <span className="text-[11px] text-blue-300 font-medium truncate">
            {mentionedLead.name || mentionedLead.phone}
          </span>
          <button
            onClick={() => setMentionedLead(null)}
            className="ml-auto text-blue-400/60"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Mention search results */}
      {showMentionSearch && mentionResults.length > 0 && (
        <div className="mx-3 sm:mx-4 mt-1 rounded-xl border border-white/10 bg-[#1a1a1a] max-h-32 overflow-y-auto shrink-0">
          {mentionResults.map((lead) => (
            <button
              key={lead.id}
              onClick={() => selectMentionLead(lead)}
              className="w-full text-left px-3 py-2 hover:bg-[#D4AF37]/[0.08] flex items-center gap-2 text-xs border-b border-white/5 last:border-0"
            >
              <AtSign size={12} className="text-blue-400 shrink-0" />
              <span className="text-white font-medium truncate">
                {lead.name || "No Name"}
              </span>
              <span className="text-[10px] text-white/30 ml-auto shrink-0">
                {lead.phone}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 p-2 sm:p-3 border-t border-white/10 bg-[#111111]/95 backdrop-blur-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-1.5 sm:gap-2 items-end min-w-0"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.xlsx,.csv,.docx"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={fileUploading}
            className="rounded-full border border-white/10 bg-black/40 p-2.5 sm:p-3 text-white/40 hover:text-[#D4AF37] disabled:opacity-40 shrink-0 transition-colors"
          >
            {fileUploading ? (
              <span className="h-3.5 w-3.5 block animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Paperclip size={16} className="sm:size-4" />
            )}
          </button>

          <div className="flex-1 min-w-0 relative">
            <input
              ref={inputRef}
              value={newMsg}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Type a message... @ to mention"
              className="w-full rounded-full border border-white/15 bg-black/40 pl-3.5 sm:pl-4 pr-9 sm:pr-10 py-2.5 sm:py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]/50 transition-colors min-w-0"
            />
            <button
              type="button"
              onClick={() => {
                setNewMsg((p) => p + "@");
                setShowMentionSearch(true);
                inputRef.current?.focus();
              }}
              className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/40 hover:text-blue-400"
            >
              <AtSign size={14} className="sm:size-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!newMsg.trim()}
            className="rounded-full bg-emerald-500 p-2.5 sm:p-3 text-white font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors flex items-center justify-center"
          >
            <Send size={16} className="sm:size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
