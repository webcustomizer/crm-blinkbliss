"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Send,
  AtSign,
  X,
  ExternalLink,
  Paperclip,
  ArrowLeft,
  MessageSquare,
  ShieldAlert,
  ChevronUp,
  Trash2,
} from "lucide-react";
import type { ChatMessage, MentionLead } from "@/types/lead";
import {
  subscribeToMessages,
  subscribeToTyping,
  subscribeToSettingsChanges,
} from "@/lib/realtime";
import ChatImage, { isImageFile } from "@/components/chat/ChatImage";
import ImagePreview from "@/components/chat/ImagePreview";

type Admin = { id: string; name: string; phone: string | null; role?: string; lastMessageAt?: string | null };

export default function SalesMessagesPanel({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [mentionedLead, setMentionedLead] = useState<MentionLead | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionLead[]>([]);
  const [showMentionSearch, setShowMentionSearch] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [disabled, setDisabled] = useState(false);
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
  const isFetchingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);

  // Load admins (sorted by last message)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/salesperson/messages/contacts", { cache: "no-store" });
        const j = await r.json();
        if (j.data) setAdmins(j.data);
      } catch {}
    })();
  }, []);

  // Realtime: listen for message toggle changes from admin
  useEffect(() => {
    const unsub = subscribeToSettingsChanges((payload) => {
      if (payload.messageEnabled === false) setDisabled(true);
      else if (payload.messageEnabled === true) setDisabled(false);
    });
    return () => unsub();
  }, []);

  // Also fetch settings on mount for initial state
  useEffect(() => {
    fetch("/api/salesperson/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.messageEnabled === false) setDisabled(true);
      })
      .catch(() => {});
  }, []);

  // Supabase Realtime: subscribe to new messages
  useEffect(() => {
    if (!selectedAdmin || !currentUserId) return;
    const ids = [currentUserId, selectedAdmin.id].sort();
    const channelKey = `${ids[0]}:${ids[1]}`;

    const unsub = subscribeToMessages(channelKey, (newMsg) => {
      if (newMsg.senderId === currentUserId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        shouldAutoScrollRef.current = true;
        return [...prev, newMsg];
      });
    });

    return () => unsub();
  }, [selectedAdmin, currentUserId]);

  // Typing
  useEffect(() => {
    if (!selectedAdmin) return;
    const { unsubscribe, sendTyping } = subscribeToTyping(
      `admin:${currentUserId}`,
      (payload) => {
        if (payload.isTyping && Date.now() - payload.ts < 5000)
          setIsTyping(true);
        else setIsTyping(false);
      },
    );
    typingRef.current = { sendTyping };
    return () => unsubscribe();
  }, [selectedAdmin, currentUserId]);

  // Auto-scroll
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "instant" });
      });
    }
  }, [messages]);

  // Mark read
  useEffect(() => {
    if (!selectedAdmin || messages.length === 0) return;
    const unread = messages
      .filter((m) => !m.isRead && m.senderId !== currentUserId)
      .map((m) => m.id);
    if (unread.length === 0) return;
    fetch("/api/salesperson/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: unread }),
    }).catch(() => {});
  }, [messages, selectedAdmin, currentUserId]);

  // Load messages
  const fetchMessages = useCallback(async (adminId: string) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setMessages([]);
    setHasMore(true);
    initialLoadDoneRef.current = false;
    try {
      const r = await fetch(
        `/api/salesperson/messages?userId=${adminId}`,
        { cache: "no-store" },
      );
      const j = await r.json();
      if (j.success && j.data) {
        shouldAutoScrollRef.current = true;
        setMessages(j.data);
        setHasMore(Boolean(j.hasMore));
      }
    } catch {}
    setLoading(false);
    initialLoadDoneRef.current = true;
    isFetchingRef.current = false;
  }, []);

  useEffect(() => {
    if (!selectedAdmin) return;
    fetchMessages(selectedAdmin.id);
  }, [selectedAdmin, fetchMessages]);

  // Load older messages
  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || !hasMore || isFetchingRef.current || !selectedAdmin) return;
    if (messages.length === 0) return;
    const oldest = messages[0];

    setLoadingMore(true);
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    try {
      const r = await fetch(
        `/api/salesperson/messages?userId=${selectedAdmin.id}&cursor=${encodeURIComponent(oldest.id)}`,
        { cache: "no-store" },
      );
      const j = await r.json();
      if (j.success && j.data) {
        shouldAutoScrollRef.current = false;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = j.data.filter((m: any) => !existingIds.has(m.id));
          return [...newMsgs, ...prev];
        });
        setHasMore(Boolean(j.hasMore));
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }
    } catch {}
    setLoadingMore(false);
  }, [messages, hasMore, loadingMore, selectedAdmin]);

  function onMessagesScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 120) {
      loadOlderMessages();
    }
  }

  function selectAdmin(admin: Admin) {
    setSelectedAdmin(admin);
    setShowChat(true);
    setNewMsg("");
    setMentionedLead(null);
  }

  async function clearAllMessages() {
    if (!selectedAdmin) return;
    if (!confirm("Delete all messages with this admin? This cannot be undone.")) return;
    try {
      const r = await fetch("/api/salesperson/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withUserId: selectedAdmin.id }),
      });
      const j = await r.json();
      if (j.success) {
        setMessages([]);
        toast.success("Messages cleared.");
      } else {
        toast.error(j.message);
      }
    } catch {
      toast.error("Failed to clear messages.");
    }
  }

  function onInputChange(val: string) {
    setNewMsg(val);
    if (typingRef.current) {
      typingRef.current.sendTyping(val.length > 0, "");
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(
        () => typingRef.current?.sendTyping(false, ""),
        3000,
      );
    }
    const atIdx = val.lastIndexOf("@");
    if (atIdx !== -1 && !val.slice(atIdx + 1).includes(" ")) {
      setShowMentionSearch(true);
      if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
      mentionTimerRef.current = setTimeout(() => {
        const q = val.slice(atIdx + 1);
        if (q.length >= 1)
          fetch(`/api/salesperson/messages?query=${encodeURIComponent(q)}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => {
              if (j.leads) setMentionResults(j.leads.slice(0, 5));
            })
            .catch(() => {});
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

  async function sendMessage() {
    if (!newMsg.trim() || !selectedAdmin) return;
    const content = newMsg.trim();
    const leadId = mentionedLead?.id || null;
    setNewMsg("");
    setMentionedLead(null);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      content,
      senderId: currentUserId,
      receiverId: selectedAdmin.id,
      leadId,
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      lead: mentionedLead ? { id: mentionedLead.id, name: mentionedLead.name, phone: mentionedLead.phone } : undefined,
    };
    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, { ...tempMsg, _sending: true } as ChatMessage & { _sending?: boolean }]);

    try {
      const r = await fetch("/api/salesperson/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: selectedAdmin.id, content, leadId }),
      });
      const j = await r.json();
      if (j.success) {
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...j.data } : m));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(j.message);
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
    if (!file || !selectedAdmin) return;
    if (file.type.startsWith("image/")) {
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      await doUploadAndSend(file, "");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function doUploadAndSend(file: File, caption: string) {
    if (!selectedAdmin) return;
    setFileUploading(true);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const blobUrl = URL.createObjectURL(file);
    const tempMsg: ChatMessage & { _sending?: boolean } = {
      id: tempId,
      content: caption || file.name,
      senderId: currentUserId,
      receiverId: selectedAdmin.id,
      leadId: mentionedLead?.id || null,
      fileUrl: blobUrl,
      fileName: file.name,
      fileSize: file.size,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      _sending: true,
    };
    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const u = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadJson = await u.json();
      if (uploadJson.success) {
        const content = caption || `📎 ${uploadJson.data.fileName}`;
        const m = await fetch("/api/salesperson/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverId: selectedAdmin.id,
            content,
            leadId: mentionedLead?.id || null,
            fileUrl: uploadJson.data.fileUrl,
            fileName: uploadJson.data.fileName,
            fileSize: uploadJson.data.fileSize,
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
        if (file && selectedAdmin) {
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-8 sm:p-12 max-w-md">
          <ShieldAlert size={40} className="mx-auto text-red-400/60 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Messages Disabled
          </h2>
          <p className="text-gray-400 text-sm">
            1-on-1 messaging has been disabled by admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full rounded-xl sm:rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] shadow-lg overflow-hidden">
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
      <div
        className={`${
          showChat ? "hidden" : "flex"
        } sm:flex w-full sm:w-64 flex-shrink-0 flex-col border-r border-white/10 bg-black/20`}
      >
        <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#D4AF37] flex items-center gap-2">
            <MessageSquare size={16} /> Admin Chat
          </h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {admins.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-xs">
              No admins available.
            </div>
          ) : (
            admins.map((admin) => (
              <button
                key={admin.id}
                onClick={() => selectAdmin(admin)}
                className={`w-full text-left p-3 sm:p-4 transition-colors hover:bg-[#D4AF37]/[0.06] flex items-center gap-3 ${
                  selectedAdmin?.id === admin.id
                    ? "bg-[#D4AF37]/[0.10] border-l-2 border-[#D4AF37]"
                    : "border-l-2 border-transparent"
                }`}
              >
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-xs font-bold shrink-0">
                  {admin.name[0]}
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm text-white font-medium truncate">
                    {admin.name}
                  </span>
                  <span className="text-[9px] text-red-400 bg-red-400/10 rounded-full px-1.5 py-px font-bold border border-red-400/20 shrink-0">
                    Admin
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div
        className={`${
          !showChat ? "hidden" : "flex"
        } sm:flex flex-1 flex-col min-w-0`}
      >
        {selectedAdmin ? (
          <>
            <div className="p-3 sm:p-4 border-b border-white/10 flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setShowChat(false)}
                className="sm:hidden p-1.5 rounded-lg text-white/60 hover:text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-xs font-bold shrink-0">
                {selectedAdmin.name[0]}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-medium text-white truncate text-sm sm:text-base">
                  {selectedAdmin.name}
                </span>
                <span className="text-[9px] text-red-400 bg-red-400/10 rounded-full px-1.5 py-px font-bold border border-red-400/20 shrink-0">
                  Admin
                </span>
              </div>
              <button
                onClick={clearAllMessages}
                title="Clear all messages"
                className="ml-auto shrink-0 rounded-lg border border-white/10 p-2 text-white/30 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div
              ref={scrollContainerRef}
              onScroll={onMessagesScroll}
              onPaste={handlePaste}
              className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3"
            >
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-start justify-center pt-8 h-full text-white/40 text-center">
                  <div>
                    <p className="text-sm">No messages yet.</p>
                    <p className="text-[10px] mt-1">
                      Type @ to mention a lead!
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
                  {messages.map((msg) => {
                    const isMine = msg.senderId === currentUserId;
                    const isSending = (msg as any)._sending;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm overflow-hidden ${
                            isMine
                              ? "bg-[#D4AF37]/20 text-white border border-[#D4AF37]/20 rounded-br-md"
                              : "bg-white/5 text-white/80 border border-white/10 rounded-bl-md"
                          }`}
                        >
                          <p className="break-words">{msg.content}</p>
                          {msg.fileUrl && isImageFile(msg.fileName) ? (
                            <ChatImage src={msg.fileUrl} alt={msg.fileName || "Image"} fileName={msg.fileName} />
                          ) : msg.fileUrl ? (
                            <a
                              href={msg.fileUrl}
                              download={msg.fileName}
                              target="_blank"
                              rel="noopener"
                              className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[10px] text-blue-400"
                            >
                              📎 {msg.fileName || "Download"}
                            </a>
                          ) : null}
                          {msg.lead && (
                            <a
                              href={`/sales/my-leads?leadId=${msg.lead.id}`}
                              className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-blue-500/15 border border-blue-500/25 px-2 py-0.5 text-[10px] text-blue-400"
                            >
                              <ExternalLink size={10} />
                              <span className="font-medium truncate max-w-[100px]">
                                {msg.lead.name || msg.lead.phone}
                              </span>
                            </a>
                          )}
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            {isSending ? (
                              <span className="h-2.5 w-2.5 block animate-spin rounded-full border border-white/40 border-t-white/80" />
                            ) : msg.isRead ? (
                              <p className="text-[9px] text-green-400/60">✓ Read</p>
                            ) : isMine ? (
                              <p className="text-[9px] text-white/30">✓ Sent</p>
                            ) : null}
                            <p className="text-[9px] opacity-40">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <div ref={chatEndRef} />
            </div>

            {isTyping && (
              <div className="px-3 sm:px-4 py-1 shrink-0">
                <p className="text-[10px] text-emerald-400/70 italic animate-pulse">
                  Admin is typing...
                </p>
              </div>
            )}

            {mentionedLead && (
              <div className="mx-3 sm:mx-4 mb-1 flex items-center gap-1.5 rounded-xl bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 shrink-0">
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

            {showMentionSearch && mentionResults.length > 0 && (
              <div className="mx-3 sm:mx-4 mb-1 rounded-xl border border-white/10 bg-[#1a1a1a] max-h-32 overflow-y-auto shrink-0">
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

            <div className="p-2 sm:p-4 border-t border-white/10 shrink-0 bg-gradient-to-t from-black/30 to-transparent">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-1.5 sm:gap-2 items-center"
              >
                <div className="flex-1 relative min-w-0">
                  <input
                    ref={inputRef}
                    value={newMsg}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder="Message... @ to mention"
                    className="w-full rounded-xl border border-white/15 bg-black/40 pl-3 sm:pl-4 pr-8 sm:pr-10 py-2.5 sm:py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]/50 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewMsg((p) => p + "@");
                      setShowMentionSearch(true);
                    }}
                    className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/40 hover:text-blue-400"
                  >
                    <AtSign size={14} />
                  </button>
                </div>
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
                  className="rounded-xl border border-white/10 bg-black/40 p-2.5 sm:p-3 text-white/40 hover:text-[#D4AF37] disabled:opacity-40 shrink-0"
                >
                  {fileUploading ? (
                    <span className="h-3.5 w-3.5 block animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <Paperclip size={16} />
                  )}
                </button>
                <button
                  type="submit"
                  disabled={!newMsg.trim()}
                  className="rounded-xl bg-[#D4AF37] px-3 sm:px-4 py-2.5 sm:py-3 text-black font-medium hover:bg-[#c79f27] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="hidden sm:flex items-center justify-center h-full text-white/40 flex-col gap-3">
            <MessageSquare size={40} className="opacity-20" />
            <p>Select an admin to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
