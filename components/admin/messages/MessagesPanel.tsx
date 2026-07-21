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
  ChevronUp,
  Trash2,
} from "lucide-react";
import type { ChatMessage, MentionLead } from "@/types/lead";
import { subscribeToMessages, subscribeToTyping } from "@/lib/realtime";
import ChatImage, { isImageFile } from "@/components/chat/ChatImage";
import ImagePreview from "@/components/chat/ImagePreview";
import { handleAPIError } from "@/lib/client-error";

type SalesPerson = { id: string; name: string; phone: string | null; isActive: boolean; lastMessageAt: string | null };

export default function MessagesPanel() {
  const [salespeople, setSalespeople] = useState<SalesPerson[]>([]);
  const [selectedUser, setSelectedUser] = useState<SalesPerson | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingName, setTypingName] = useState("");
  const [mentionedLead, setMentionedLead] = useState<MentionLead | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionLead[]>([]);
  const [showMentionSearch, setShowMentionSearch] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [unreadPerUser, setUnreadPerUser] = useState<Record<string, number>>({});
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

  // Fetch current user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.user?.id) setCurrentUserId(j.user.id);
      })
      .catch((e) => handleAPIError(e, "Failed to load session"));
  }, []);

  // Load salespeople (sorted by last message)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/messages/contacts", { cache: "no-store" });
        const j = await r.json();
        if (j.data) setSalespeople(j.data);
      } catch (e) { handleAPIError(e, "Failed to load contacts"); }
      setUsersLoading(false);
    })();
  }, []);

  // Fetch per-user unread counts
  const fetchUnreadPerUser = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/messages/unread-per-user", { cache: "no-store" });
      const j = await r.json();
      if (j.success) setUnreadPerUser(j.data);
    } catch (e) { console.error("Failed to load unread per user:", e); }
  }, []);

  useEffect(() => {
    fetchUnreadPerUser();
    const timer = setInterval(fetchUnreadPerUser, 10000);
    return () => clearInterval(timer);
  }, [fetchUnreadPerUser]);

  // Refresh unread counts when new message arrives (via realtime)
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = subscribeToMessages(`admin-bell:${currentUserId}`, () => {
      fetchUnreadPerUser();
    });
    return () => unsub();
  }, [currentUserId, fetchUnreadPerUser]);

  // Supabase Realtime: subscribe to new messages
  useEffect(() => {
    if (!selectedUser || !currentUserId) return;
    const ids = [currentUserId, selectedUser.id].sort();
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
  }, [selectedUser, currentUserId]);

  // Typing
  useEffect(() => {
    if (!selectedUser) return;
    const { unsubscribe, sendTyping } = subscribeToTyping(
      `admin:${selectedUser.id}`,
      (payload) => {
        if (payload.isTyping && Date.now() - payload.ts < 5000) {
          setIsTyping(true);
          setTypingName(payload.name);
        } else {
          setIsTyping(false);
        }
      },
    );
    typingRef.current = { sendTyping };
    return () => unsubscribe();
  }, [selectedUser]);

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
    if (messages.length === 0 || !selectedUser) return;
    const unread = messages
      .filter((m) => !m.isRead && m.senderId === selectedUser.id)
      .map((m) => m.id);
    if (unread.length === 0) return;
    fetch("/api/admin/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: unread }),
    }).catch((e) => console.error("Failed to mark read:", e));
  }, [messages, selectedUser]);

  // Load messages when user selected
  const fetchMessages = useCallback(async (userId: string) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setMessages([]);
    setHasMore(true);
    initialLoadDoneRef.current = false;
    try {
      const r = await fetch(`/api/admin/messages?userId=${userId}`, { cache: "no-store" });
      const j = await r.json();
      if (j.success && j.data) {
        shouldAutoScrollRef.current = true;
        setMessages(j.data);
        setHasMore(Boolean(j.hasMore));
      }
    } catch (e) { handleAPIError(e, "Failed to load messages"); }
    setLoading(false);
    initialLoadDoneRef.current = true;
    isFetchingRef.current = false;
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    fetchMessages(selectedUser.id);
  }, [selectedUser, fetchMessages]);

  // Load older messages
  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || !hasMore || isFetchingRef.current || !selectedUser) return;
    if (messages.length === 0) return;
    const oldest = messages[0];

    setLoadingMore(true);
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    try {
      const r = await fetch(
        `/api/admin/messages?userId=${selectedUser.id}&cursor=${encodeURIComponent(oldest.id)}`,
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
    } catch (e) { console.error("Failed to load older messages:", e); }
    setLoadingMore(false);
  }, [messages, hasMore, loadingMore, selectedUser]);

  function onMessagesScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 120) {
      loadOlderMessages();
    }
  }

  function selectUser(sp: SalesPerson) {
    setSelectedUser(sp);
    setMentionedLead(null);
    setNewMsg("");
    setShowChat(true);
    setUnreadPerUser((prev) => {
      const next = { ...prev };
      delete next[sp.id];
      return next;
    });
  }

  async function clearAllMessages() {
    if (!selectedUser) return;
    if (!confirm("Delete all messages with this salesperson? This cannot be undone.")) return;
    try {
      const r = await fetch("/api/admin/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withUserId: selectedUser.id }),
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
        if (q.length >= 1) {
          fetch(`/api/admin/messages?query=${encodeURIComponent(q)}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => {
              if (j.leads) setMentionResults(j.leads.slice(0, 5));
            })
            .catch((e) => console.error("Failed to search mentions:", e));
        }
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
    if (!newMsg.trim() || !selectedUser) return;
    const content = newMsg.trim();
    const leadId = mentionedLead?.id || null;
    setNewMsg("");
    setMentionedLead(null);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tempMsg: ChatMessage & { _sending?: boolean } = {
      id: tempId,
      content,
      senderId: currentUserId,
      receiverId: selectedUser.id,
      leadId,
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      _sending: true,
      lead: mentionedLead ? { id: mentionedLead.id, name: mentionedLead.name, phone: mentionedLead.phone } : undefined,
    };
    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const r = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: selectedUser.id, content, leadId }),
      });
      const j = await r.json();
      if (j.success) {
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...j.data } : m));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(j.message);
        setNewMsg(content);
      }
    } catch (e) {
      console.error("Failed to send message:", e);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Failed.");
      setNewMsg(content);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;
    if (file.type.startsWith("image/")) {
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      await doUploadAndSend(file, "");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function doUploadAndSend(file: File, caption: string) {
    if (!selectedUser) return;
    setFileUploading(true);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const blobUrl = URL.createObjectURL(file);
    const tempMsg: ChatMessage & { _sending?: boolean } = {
      id: tempId,
      content: caption || file.name,
      senderId: currentUserId,
      receiverId: selectedUser.id,
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
      const uj = await u.json();
      if (uj.success) {
        const content = caption || `📎 ${uj.data.fileName}`;
        const m = await fetch("/api/admin/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverId: selectedUser.id,
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
    } catch (e) {
      console.error("Failed to upload file:", e);
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
        if (file && selectedUser) {
          e.preventDefault();
          setPreviewFile(file);
          setPreviewUrl(URL.createObjectURL(file));
        }
        return;
      }
    }
  }

  return (
    <div className="flex h-full rounded-xl sm:rounded-[28px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
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
      {/* Sidebar */}
      <div
        className={`${
          showChat ? "hidden" : "flex"
        } sm:flex w-full sm:w-72 flex-shrink-0 flex-col border-r border-white/10 bg-black/20`}
      >
        <div className="p-3 sm:p-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-[#D4AF37] flex items-center gap-2">
            <MessageSquare size={16} /> Salespersons
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {usersLoading ? (
            <div className="p-4 text-center text-white/40 text-sm">
              Loading…
            </div>
          ) : salespeople.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-sm">
              No salespersons yet.
            </div>
          ) : (
            salespeople.map((sp) => {
              const spUnread = unreadPerUser[sp.id] || 0;
              return (
              <div
                key={sp.id}
                className={`flex items-center hover:bg-[#D4AF37]/[0.06] ${
                  selectedUser?.id === sp.id
                    ? "bg-[#D4AF37]/[0.10] border-l-2 border-[#D4AF37]"
                    : "border-l-2 border-transparent"
                }`}
              >
                <button
                  onClick={() => selectUser(sp)}
                  className="flex-1 text-left p-3 sm:p-4 flex items-center gap-3 min-w-0"
                >
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-xs font-bold shrink-0">
                    {sp.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-white font-medium truncate block">
                      {sp.name}
                    </span>
                    {sp.phone && (
                      <span className="text-[10px] text-white/40 truncate block">
                        {sp.phone}
                      </span>
                    )}
                    {!sp.isActive && (
                      <span className="text-[10px] text-red-400">Inactive</span>
                    )}
                  </div>
                  {spUnread > 0 && (
                    <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {spUnread > 99 ? "99+" : spUnread}
                    </span>
                  )}
                </button>
              </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        className={`${
          !showChat ? "hidden" : "flex"
        } sm:flex flex-1 flex-col min-w-0`}
      >
        {selectedUser ? (
          <>
            <div className="p-3 sm:p-4 border-b border-white/10 flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setShowChat(false)}
                className="sm:hidden p-1.5 rounded-lg text-white/60 hover:text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-xs font-bold shrink-0">
                {selectedUser.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-white truncate text-sm sm:text-base block">
                  {selectedUser.name}
                </span>
                {selectedUser.phone && (
                  <span className="text-[10px] sm:text-xs text-white/40 block">
                    {selectedUser.phone}
                  </span>
                )}
                {!selectedUser.isActive && (
                  <span className="text-[10px] text-red-400">Deactivated</span>
                )}
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
                <div className="flex items-start justify-center pt-8 h-full text-white/40">
                  <p className="text-sm">
                    No messages yet. Type @ to mention a lead!
                  </p>
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
                    const isMine = msg.senderId !== selectedUser.id;
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
                          {!isMine && msg.sender?.name && (
                            <p className="text-[10px] sm:text-xs text-[#D4AF37]/70 font-medium mb-0.5">
                              {msg.sender.name}
                            </p>
                          )}
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
                              href={`/admin/leads?leadId=${msg.lead.id}`}
                              target="_blank"
                              rel="noopener"
                              className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-blue-500/15 border border-blue-500/25 px-2 py-0.5 text-[10px] text-blue-400"
                            >
                              <ExternalLink size={10} />
                              <span className="font-medium truncate max-w-[120px]">
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

            {isTyping && typingName && (
              <div className="px-3 sm:px-4 py-1 shrink-0">
                <p className="text-[10px] text-emerald-400/70 italic animate-pulse">
                  {typingName} is typing...
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
                      inputRef.current?.focus();
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
            <p>Select a salesperson to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
