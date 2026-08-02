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
  ArrowLeft,
  Search,
  Reply,
} from "lucide-react";
import type { GroupChatMessage, MentionLead } from "@/types/lead";
import { subscribeToGroupMessages, subscribeToTyping } from "@/lib/realtime";
import ChatImage, { isImageFile } from "@/components/chat/ChatImage";
import MentionText from "@/components/chat/MentionText";
import { handleAPIError } from "@/lib/client-error";
import ImagePreview from "@/components/chat/ImagePreview";

interface Conversation {
  teamLeader: { id: string; name: string };
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string };
  } | null;
  unreadCount: number;
  memberCount: number;
}

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

function formatConversationTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default function GroupChatPanel({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [tab, setTab] = useState<"GENERAL" | "TL_TEAM">("GENERAL");
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<Conversation["teamLeader"] | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");

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
  const [replyTo, setReplyTo] = useState<GroupChatMessage | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<{
    sendTyping: (b: boolean, n: string, c?: { chatType?: string; teamLeaderId?: string | null }) => void;
  } | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typingRemovalTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  const isFetchingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const selectedTeamLeaderRef = useRef(selectedTeamLeader);
  const tabRef = useRef(tab);

  useEffect(() => {
    selectedTeamLeaderRef.current = selectedTeamLeader;
  }, [selectedTeamLeader]);

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  useEffect(() => {
    if (!initialLoadDoneRef.current) return;
    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "instant" });
      });
    }
  }, [messages]);

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const res = await fetch("/api/admin/group-chat?conversations=true&chatType=TL_TEAM", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.conversations) {
        setConversations(json.conversations);
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "TL_TEAM" && !selectedTeamLeader) {
      fetchConversations();
    }
  }, [tab, selectedTeamLeader, fetchConversations]);

  // Refresh conversations when a TL_TEAM message arrives while on conversation list
  const refreshConversationsRef = useRef<() => void>(() => {});
  useEffect(() => {
    refreshConversationsRef.current = () => {
      if (tab === "TL_TEAM" && !selectedTeamLeader) {
        fetchConversations();
      }
    };
  }, [tab, selectedTeamLeader, fetchConversations]);

  // Fetch messages for chat view
  const fetchMessages = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const tlParam = selectedTeamLeaderRef.current ? `&teamLeaderId=${selectedTeamLeaderRef.current.id}` : "";
      const res = await fetch(`/api/admin/group-chat?chatType=${tab}${tlParam}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) {
        setDisabled(true);
        return;
      }
      setDisabled(false);
      if (json.data) {
        shouldAutoScrollRef.current = true;
        initialLoadDoneRef.current = true;
        setMessages(json.data);
      }
      setHasMore(Boolean(json.hasMore));
      if (json.users) setUsers(json.users);
      setLoading(false);
    } catch (e) {
      handleAPIError(e, "Failed to load group chat messages");
    } finally {
      isFetchingRef.current = false;
    }
  }, [tab]);

  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || !hasMore || isFetchingRef.current) return;
    if (messages.length === 0) return;
    const oldest = messages[0];

    setLoadingMore(true);
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    try {
      const tlParam = selectedTeamLeaderRef.current ? `&teamLeaderId=${selectedTeamLeaderRef.current.id}` : "";
      const res = await fetch(
        `/api/admin/group-chat?chatType=${tab}${tlParam}&cursor=${encodeURIComponent(oldest.id)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (json.success && json.data) {
        shouldAutoScrollRef.current = false;
        setMessages((prev) => [...json.data, ...prev]);
        setHasMore(Boolean(json.hasMore));
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }
    } catch (e) {
      console.error("Failed to load older group messages:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [messages, hasMore, loadingMore]);

  function onMessagesScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 120) {
      loadOlderMessages();
    }
  }

  // Realtime: new group messages
  useEffect(() => {
    const unsub = subscribeToGroupMessages((incoming: GroupChatMessage) => {
      if (!incoming?.id) {
        fetchMessages();
        refreshConversationsRef.current();
        return;
      }
      if (incoming.senderId === currentUserId) return;

      // If we're in TL_TEAM chat view, filter by teamLeaderId
      const tlRef = selectedTeamLeaderRef.current;
      if (incoming.chatType === "TL_TEAM") {
        if (tlRef && incoming.teamLeaderId !== tlRef.id) {
          // Not for this team — refresh conversation list if visible
          refreshConversationsRef.current();
          return;
        }
        if (!tlRef) {
          refreshConversationsRef.current();
          return;
        }
      }

      if (tab !== incoming.chatType) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        shouldAutoScrollRef.current = true;
        return [...prev, incoming];
      });
    });
    return () => unsub();
  }, [fetchMessages, currentUserId, tab]);

  // Typing
  useEffect(() => {
    const { unsubscribe, sendTyping } = subscribeToTyping(
      "group:chat",
      (payload) => {
        const myTab = tabRef.current;
        const myTlId = myTab === "TL_TEAM" ? selectedTeamLeaderRef.current?.id : null;
        if (myTab === "TL_TEAM") {
          if (payload.chatType !== "TL_TEAM" || payload.teamLeaderId !== myTlId) return;
        } else if (payload.chatType === "TL_TEAM") {
          return;
        }
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

  // Tab/selection change: load messages and mark read
  useEffect(() => {
    if (!selectedTeamLeader && tab === "TL_TEAM") {
      // Conversation list view — no messages to load
      setMessages([]);
      setUsers([]);
      setLoading(false);
      initialLoadDoneRef.current = false;
      return;
    }
    setLoading(true);
    setMessages([]);
    initialLoadDoneRef.current = false;
    fetchMessages();
    const tlParam = selectedTeamLeader ? `&teamLeaderId=${selectedTeamLeader.id}` : "";
    fetch(`/api/admin/group-chat?chatType=${tab}${tlParam}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    }).then(() => refreshConversationsRef.current()).catch(() => {});
  }, [tab, selectedTeamLeader, fetchMessages]);

  // Mark read
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
    const tlParam = selectedTeamLeader ? `&teamLeaderId=${selectedTeamLeader.id}` : "";
    fetch(`/api/admin/group-chat?chatType=${tab}${tlParam}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: unread }),
    }).then(() => refreshConversationsRef.current()).catch(() => {});
  }, [messages, currentUserId, tab, selectedTeamLeader]);

  const myName = users.find((u) => u.id === currentUserId)?.name || "Admin";

  function onInputChange(val: string) {
    setNewMsg(val);
    if (typingRef.current) {
      const ctx = {
        chatType: tab,
        teamLeaderId: tab === "TL_TEAM" ? selectedTeamLeader?.id || null : null,
      };
      typingRef.current.sendTyping(val.length > 0, myName, ctx);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        typingRef.current?.sendTyping(false, myName, ctx);
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
            `/api/admin/group-chat?query=${encodeURIComponent(
              val.slice(atIdx + 1),
            )}`,
            { cache: "no-store" },
          );
          const j = await r.json();
          if (j.leads) setMentionResults(j.leads.slice(0, 5));
        } catch (e) {
          console.error("Failed to search mentions:", e);
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

  async function deleteAllMessages() {
    const label = tab === "GENERAL" ? "General" : (selectedTeamLeader?.name || "this team");
    if (!confirm(`Delete all messages in ${label}? This cannot be undone.`)) return;
    try {
      const tlParam = selectedTeamLeader ? `&teamLeaderId=${selectedTeamLeader.id}` : "";
      const r = await fetch(`/api/admin/group-chat?chatType=${tab}${tlParam}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (j.success) {
        setMessages([]);
        toast.success("All messages cleared.");
        refreshConversationsRef.current();
      } else {
        toast.error(j.message);
      }
    } catch (e) {
      console.error("Failed to clear messages:", e);
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
      replyToId: replyTo?.id || null,
      createdAt: new Date().toISOString(),
      _sending: true,
      sender: users.find((u) => u.id === currentUserId),
      lead: mentionedLead
        ? { id: mentionedLead.id, name: mentionedLead.name, phone: mentionedLead.phone }
        : undefined,
      replyTo: replyTo
        ? { id: replyTo.id, content: replyTo.content, senderId: replyTo.senderId, sender: replyTo.sender }
        : undefined,
    };
    const replyingTo = replyTo;
    setNewMsg("");
    setMentionedLead(null);
    setReplyTo(null);
    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const body: Record<string, unknown> = { content, leadId, chatType: tab, replyToId: replyingTo?.id || null };
      if (tab === "TL_TEAM" && selectedTeamLeader) {
        body.teamLeaderId = selectedTeamLeader.id;
      }
      const res = await fetch("/api/admin/group-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...json.data } : m)),
        );
        refreshConversationsRef.current();
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(json.message);
        setNewMsg(content);
      }
    } catch (e) {
      console.error("Failed to send group message:", e);
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
      replyToId: replyTo?.id || null,
      createdAt: new Date().toISOString(),
      _sending: true,
      sender: users.find((u) => u.id === currentUserId),
      replyTo: replyTo
        ? { id: replyTo.id, content: replyTo.content, senderId: replyTo.senderId, sender: replyTo.sender }
        : undefined,
    };
    const replyingTo = replyTo;
    setReplyTo(null);
    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, tempMsg]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const u = await fetch("/api/upload", { method: "POST", body: fd });
      const uj = await u.json();
      if (uj.success) {
        const content = caption || `📎 ${uj.data.fileName}`;
        const body: Record<string, unknown> = {
          content,
          leadId: mentionedLead?.id || null,
          fileUrl: uj.data.fileUrl,
          fileName: uj.data.fileName,
          fileSize: uj.data.fileSize,
          chatType: tab,
          replyToId: replyingTo?.id || null,
        };
        if (tab === "TL_TEAM" && selectedTeamLeader) {
          body.teamLeaderId = selectedTeamLeader.id;
        }
        const m = await fetch("/api/admin/group-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const mj = await m.json();
        if (mj.success) {
          URL.revokeObjectURL(blobUrl);
          setMessages((prev) =>
            prev.map((msg) => (msg.id === tempId ? { ...mj.data } : msg)),
          );
          refreshConversationsRef.current();
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
      console.error("Failed to upload file to group chat:", e);
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
        <ShieldAlert size={36} className="mx-auto text-red-400/60 mb-3 sm:mb-4" />
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
          Group Chat Disabled
        </h2>
        <p className="text-gray-400 text-sm">
          Enable it from Settings → Communication.
        </p>
      </div>
    );
  }

  // Show conversation list when TL_TEAM tab is active and no team leader selected
  const showConversations = tab === "TL_TEAM" && !selectedTeamLeader;

  const filteredConversations = conversationSearch
    ? conversations.filter((c) =>
        c.teamLeader.name.toLowerCase().includes(conversationSearch.toLowerCase()),
      )
    : conversations;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

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
      <div className="shrink-0 bg-gradient-to-r from-[#171717] to-[#111111] z-10">
        <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          {showConversations ? (
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#D4AF37]">
              <Users size={16} className="sm:size-[18px]" />
            </div>
          ) : selectedTeamLeader ? (
            <button
              onClick={() => {
                setSelectedTeamLeader(null);
                setConversationSearch("");
              }}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft size={16} className="sm:size-[18px]" />
            </button>
          ) : (
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Users size={16} className="sm:size-[18px]" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold text-white text-xs sm:text-sm truncate">
              {showConversations
                ? "Team Chats"
                : selectedTeamLeader
                  ? selectedTeamLeader.name
                  : tab === "GENERAL"
                    ? "General Chat"
                    : "Team Chats"}
            </h2>
            <p className="text-[10px] sm:text-xs text-gray-400 truncate">
              {showConversations
                ? `${conversations.length} teams${totalUnread > 0 ? ` · ${totalUnread} unread` : ""}`
                : selectedTeamLeader
                  ? `${users.length} members`
                  : `${users.length} members`}
            </p>
          </div>
          {!showConversations && (
            <button
              onClick={deleteAllMessages}
              title="Clear all messages"
              className="ml-auto shrink-0 rounded-lg border border-white/10 p-2 text-white/30 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {/* Tab bar — always visible */}
        <div className="flex border-t border-white/5">
          <button
            onClick={() => {
              setTab("GENERAL");
              setSelectedTeamLeader(null);
              setConversationSearch("");
            }}
            className={`flex-1 py-2 text-[11px] sm:text-xs font-medium transition-colors relative ${
              tab === "GENERAL"
                ? "text-[#D4AF37]"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            General
            {tab === "GENERAL" && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#D4AF37] rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setTab("TL_TEAM");
              setSelectedTeamLeader(null);
            }}
            className={`flex-1 py-2 text-[11px] sm:text-xs font-medium transition-colors relative ${
              tab === "TL_TEAM"
                ? "text-[#D4AF37]"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Teams
            {tab === "TL_TEAM" && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#D4AF37] rounded-full" />
            )}
            {tab !== "TL_TEAM" && totalUnread > 0 && (
              <span className="absolute top-1 right-[18%] min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conversation list view */}
      {showConversations && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="shrink-0 px-3 pt-3 pb-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                placeholder="Search teams..."
                className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 py-2 text-xs sm:text-sm text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37]/50 transition-colors"
              />
            </div>
          </div>

          {/* List */}
          <div
            className="flex-1 min-h-0 overflow-y-auto"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(212,175,55,0.05) 1px, transparent 0)",
              backgroundSize: "22px 22px",
              backgroundColor: "#0b0b0b",
            }}
          >
            {conversationsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-white/40 text-sm">
                {conversationSearch ? "No matching teams" : "No teams found"}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.teamLeader.id}
                  onClick={() => setSelectedTeamLeader(conv.teamLeader)}
                  className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-white/[0.04] border-b border-white/5 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] font-bold text-sm shrink-0">
                    {conv.teamLeader.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-medium text-white truncate">
                        {conv.teamLeader.name}
                      </span>
                      <span className="text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-1.5 py-px text-[8px] sm:text-[9px] font-bold shrink-0">
                        TL
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-white/40 truncate mt-0.5">
                      {conv.memberCount} member{conv.memberCount !== 1 ? "s" : ""}
                      {conv.lastMessage && (
                        <>
                          {" · "}
                          <span className="text-white/50">
                            {conv.lastMessage.sender.id === currentUserId
                              ? "You"
                              : conv.lastMessage.sender.name.split(" ")[0]}
                            :{" "}
                            {conv.lastMessage.content.length > 50
                              ? conv.lastMessage.content.slice(0, 50) + "…"
                              : conv.lastMessage.content}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {conv.lastMessage && (
                      <span className="text-[9px] sm:text-[10px] text-white/30">
                        {formatConversationTime(conv.lastMessage.createdAt)}
                      </span>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#D4AF37] text-[9px] font-bold text-black px-1">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat view — General or specific team */}
      {!showConversations && (
        <>
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
                  <p className="text-base sm:text-lg">
                    {tab === "GENERAL" ? "Welcome to Team Chat! 👋" : `Chat with ${selectedTeamLeader?.name || "team"}`}
                  </p>
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
                        className={`flex group ${
                          isOwn ? "justify-end" : "justify-start"
                        } ${prevSame ? "mt-0.5" : "mt-2"}`}
                      >
                        <div className="max-w-[82%] sm:max-w-[65%] relative">
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
                            className={`relative px-3 py-2 sm:px-3.5 sm:py-2 text-xs sm:text-sm shadow-sm ${
                              isOwn
                                ? "bg-emerald-600/25 text-white border border-emerald-500/25 rounded-2xl rounded-br-sm"
                                : "bg-white/[0.06] text-white/85 border border-white/10 rounded-2xl rounded-bl-sm"
                            }`}
                          >
                            {msg.replyTo && (
                              <div className={`mb-1.5 px-2 py-1.5 rounded-lg border-l-2 ${
                                isOwn
                                  ? "bg-emerald-700/20 border-emerald-400/40"
                                  : "bg-white/[0.04] border-[#D4AF37]/40"
                              }`}>
                                <p className={`text-[9px] sm:text-[10px] font-semibold mb-0.5 ${
                                  isOwn ? "text-emerald-300/70" : "text-[#D4AF37]/70"
                                }`}>
                                  {msg.replyTo.sender?.name || "Unknown"}
                                </p>
                                <p className="text-[10px] sm:text-[11px] text-white/40 line-clamp-2 leading-snug">
                                  {msg.replyTo.content}
                                </p>
                              </div>
                            )}
                            <p className="break-words whitespace-pre-wrap leading-relaxed">
                              <MentionText content={msg.content} lead={msg.lead} leadPath="/admin/leads" />
                            </p>

                            {msg.fileUrl && isImageFile(msg.fileName) ? (
                              <ChatImage
                                src={msg.fileUrl}
                                alt={msg.fileName || "Image"}
                                fileName={msg.fileName}
                              />
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
                            <button
                              onClick={() => setReplyTo(msg)}
                              className={`absolute top-1.5 ${
                                isOwn ? "left-1.5" : "right-1.5"
                              } opacity-0 group-hover:opacity-100 p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-all`}
                              title="Reply"
                            >
                              <Reply size={13} />
                            </button>
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

          {replyTo && (
            <div className="mx-3 sm:mx-4 mt-1 flex items-center gap-2 rounded-xl bg-[#D4AF37]/[0.08] border border-[#D4AF37]/20 px-3 py-2 shrink-0">
              <Reply size={14} className="text-[#D4AF37] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#D4AF37]/70 font-semibold">
                  Replying to {replyTo.sender?.name || "Unknown"}
                </p>
                <p className="text-[11px] text-white/40 truncate">
                  {replyTo.content}
                </p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-white/40 hover:text-white/70 shrink-0"
              >
                <X size={14} />
              </button>
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
                    const newVal = newMsg + "@";
                    setNewMsg(newVal);
                    setShowMentionSearch(true);
                    onInputChange(newVal);
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
        </>
      )}
    </div>
  );
}
