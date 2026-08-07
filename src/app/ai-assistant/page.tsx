"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { getApiUrl } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle, Bot, ChevronLeft, ChevronRight, Loader2, Menu, MoreHorizontal,
  Pencil, Plus, Search, SendHorizonal, Sparkles, Trash2, User, X,
} from "lucide-react";

interface Message {
  _id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ConversationSummary {
  _id: string;
  title: string;
  preview?: string;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

type ConversationDialog = { type: "rename" | "delete"; conversation: ConversationSummary } | null;

const greeting = (): Message => ({
  role: "assistant",
  content: "Hello! I'm **WareFlow AI**, your business analytics assistant. Ask me about revenue, branches, salespeople, products, payments, or targets.",
  createdAt: new Date().toISOString(),
});

const suggestions = [
  "What is today's total revenue?",
  "Compare branch performance",
  "Which salesperson has the highest sales?",
  "Show this month's revenue trend",
];

const NEW_CHAT_MARKER = "__new_chat__";
const getActiveChatStorageKey = () => {
  const userId = localStorage.getItem("userId") || localStorage.getItem("userPhone") || "admin";
  return `wareflow:ai-active-chat:${userId}`;
};

const getChatIdFromUrl = () => new URL(window.location.href).searchParams.get("chat");
const syncChatUrl = (conversationId: string | null) => {
  const url = new URL(window.location.href);
  if (conversationId) url.searchParams.set("chat", conversationId);
  else url.searchParams.delete("chat");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
};

export default function AiAssistantPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([greeting()]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ConversationDialog>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [isDialogBusy, setIsDialogBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const api = getApiUrl();

  const loadConversation = useCallback(async (id: string) => {
    setIsHistoryLoading(true);
    setMenuId(null);
    try {
      const res = await fetch(`${api}/api/ai/conversations/${id}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load chat");
      setActiveId(id);
      localStorage.setItem(getActiveChatStorageKey(), id);
      syncChatUrl(id);
      setMessages(data.conversation.messages.length ? data.conversation.messages : [greeting()]);
      setSidebarOpen(false);
    } catch (error) {
      console.error("WareFlow AI: Failed to load conversation", error);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [api]);

  const loadConversations = useCallback(async (restoreSelection = false) => {
    try {
      const res = await fetch(`${api}/api/ai/conversations`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load chats");
      setConversations(data.conversations || []);
      if (restoreSelection) {
        const urlChatId = getChatIdFromUrl();
        const savedId = localStorage.getItem(getActiveChatStorageKey());
        const preferredId = urlChatId || savedId;
        if (preferredId === NEW_CHAT_MARKER) {
          setActiveId(null);
          setMessages([greeting()]);
          setIsHistoryLoading(false);
        } else {
          const conversationToOpen = data.conversations?.find((item: ConversationSummary) => item._id === preferredId)
            || data.conversations?.[0];
          if (conversationToOpen) await loadConversation(conversationToOpen._id);
          else setIsHistoryLoading(false);
        }
      } else setIsHistoryLoading(false);
    } catch (error) {
      console.error("WareFlow AI: Failed to load conversations", error);
      setIsHistoryLoading(false);
    }
  }, [api, loadConversation]);

  useEffect(() => {
    if (localStorage.getItem("userRole")?.toLowerCase() !== "admin") {
      window.location.href = "/billing";
      return;
    }
    void loadConversations(true);
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!dialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDialogBusy) setDialog(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    if (dialog.type === "rename") setTimeout(() => renameInputRef.current?.select(), 50);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [dialog, isDialogBusy]);

  useEffect(() => {
    if (!menuId) return;
    const closeMenu = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-chat-menu]")) setMenuId(null);
    };
    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [menuId]);

  const newChat = () => {
    setActiveId(null);
    localStorage.setItem(getActiveChatStorageKey(), NEW_CHAT_MARKER);
    syncChatUrl(null);
    setMessages([greeting()]);
    setInput("");
    setSidebarOpen(false);
    setMenuId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    const optimistic: Message = { role: "user", content: trimmed, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    setInput("");
    setIsLoading(true);
    try {
      const res = await fetch(`${api}/api/ai/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId: activeId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "The assistant could not respond");
      setActiveId(data.conversationId);
      localStorage.setItem(getActiveChatStorageKey(), data.conversationId);
      syncChatUrl(data.conversationId);
      setMessages((current) => [...current, { role: "assistant", content: data.reply, createdAt: new Date().toISOString() }]);
      await loadConversations(false);
    } catch (error) {
      setMessages((current) => [...current, {
        role: "assistant",
        content: `⚠️ ${error instanceof Error ? error.message : "Could not reach the assistant. Please try again."}`,
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeId, api, isLoading, loadConversations]);

  const openDialog = (type: "rename" | "delete", conversation: ConversationSummary) => {
    setMenuId(null);
    setDialogError("");
    setRenameTitle(conversation.title);
    setDialog({ type, conversation });
  };

  const renameConversation = async () => {
    if (!dialog || dialog.type !== "rename") return;
    const title = renameTitle.trim();
    if (!title) {
      setDialogError("Enter a name for this chat.");
      return;
    }
    if (title === dialog.conversation.title) {
      setDialog(null);
      return;
    }
    setIsDialogBusy(true);
    setDialogError("");
    try {
      const res = await fetch(`${api}/api/ai/conversations/${dialog.conversation._id}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not rename this chat.");
      setConversations((items) => items.map((item) => item._id === dialog.conversation._id ? { ...item, title } : item));
      setDialog(null);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Could not rename this chat.");
    } finally {
      setIsDialogBusy(false);
    }
  };

  const deleteConversation = async () => {
    if (!dialog || dialog.type !== "delete") return;
    const conversation = dialog.conversation;
    setIsDialogBusy(true);
    setDialogError("");
    try {
      const res = await fetch(`${api}/api/ai/conversations/${conversation._id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not delete this chat.");
      const remaining = conversations.filter((item) => item._id !== conversation._id);
      setConversations(remaining);
      setDialog(null);
      if (activeId === conversation._id) {
        if (remaining[0]) await loadConversation(remaining[0]._id);
        else newChat();
      }
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Could not delete this chat.");
    } finally {
      setIsDialogBusy(false);
    }
    setMenuId(null);
  };

  const filtered = conversations.filter((conversation) => conversation.title.toLowerCase().includes(search.toLowerCase()));
  const formatTime = (value: string) => new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const historyPanel = (
    <aside className="flex h-full w-[18rem] shrink-0 flex-col border-r border-gray-200 bg-gray-50/80 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-neutral-100"><Sparkles className="h-5 w-5 text-orange-500" /> WareFlow AI</div>
        <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 hover:bg-gray-200 md:hidden dark:hover:bg-neutral-800"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-2 px-3">
        <button onClick={newChat} className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium shadow-sm hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-800"><Plus className="h-4 w-4" /> New chat</button>
        <label className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 dark:bg-neutral-900"><Search className="h-4 w-4 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" /></label>
      </div>
      <div className="mt-4 flex-1 overflow-y-auto px-2 pb-4">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Your chats</p>
        {isHistoryLoading && !conversations.length ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="mx-2 mb-2 h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-neutral-800" />) : null}
        {!isHistoryLoading && !filtered.length && <p className="px-3 py-8 text-center text-xs text-gray-400">{search ? "No chats found" : "Your conversations will appear here"}</p>}
        {filtered.map((conversation) => (
          <div key={conversation._id} data-chat-menu className={`group relative mb-1 flex items-center rounded-xl ${activeId === conversation._id ? "bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-100" : "hover:bg-gray-100 dark:hover:bg-neutral-900"}`}>
            <button onClick={() => void loadConversation(conversation._id)} className="min-w-0 flex-1 px-3 py-2.5 text-left text-sm"><span className="block truncate font-medium">{conversation.title}</span></button>
            <button onClick={() => setMenuId(menuId === conversation._id ? null : conversation._id)} aria-label={`Options for ${conversation.title}`} aria-expanded={menuId === conversation._id} className="mr-1 rounded-lg p-1.5 opacity-50 transition hover:bg-black/5 hover:opacity-100 group-hover:opacity-100 dark:hover:bg-white/10"><MoreHorizontal className="h-4 w-4" /></button>
            {menuId === conversation._id && <div className="absolute right-1 top-10 z-20 w-36 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 dark:border-neutral-700 dark:bg-neutral-900"><button onClick={() => openDialog("rename", conversation)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-neutral-800"><Pencil className="h-3.5 w-3.5" /> Rename</button><div className="my-1 border-t border-gray-100 dark:border-neutral-800" /><button onClick={() => openDialog("delete", conversation)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" /> Delete</button></div>}
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 px-4 py-3 text-[11px] text-gray-400 dark:border-neutral-800">Chats are securely saved to your admin account.</div>
    </aside>
  );

  return (
    <AdminLayout>
      <>
      <div className="relative flex h-[calc(100dvh-6.5rem)] min-h-[38rem] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <div className={`hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out md:block ${historyCollapsed ? "w-0" : "w-[18rem]"}`}>
          <div className={`h-full transition-transform duration-300 ease-in-out ${historyCollapsed ? "-translate-x-full" : "translate-x-0"}`}>{historyPanel}</div>
        </div>
        <button
          onClick={() => setHistoryCollapsed((collapsed) => !collapsed)}
          aria-label={historyCollapsed ? "Open chat history" : "Close chat history"}
          title={historyCollapsed ? "Open chat history" : "Close chat history"}
          className={`absolute top-1/2 z-30 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition-[left,color,background-color,border-color] duration-300 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 md:flex dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-orange-700 dark:hover:bg-orange-950/40 dark:hover:text-orange-400 ${historyCollapsed ? "left-4" : "left-[18rem]"}`}
        >
          {historyCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button aria-label="Close history" className={`absolute inset-0 z-30 bg-black/40 transition-opacity duration-300 md:hidden ${sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setSidebarOpen(false)} />
        <div className={`absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>{historyPanel}</div>

        <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-neutral-900">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-4 dark:border-neutral-800">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} aria-label="Open chat history" className="rounded-lg p-2 hover:bg-gray-100 md:hidden dark:hover:bg-neutral-800"><Menu className="h-5 w-5" /></button>
              <div><h1 className="truncate font-semibold text-gray-900 dark:text-white">{conversations.find((item) => item._id === activeId)?.title || "New chat"}</h1><p className="text-[11px] text-gray-400">Business analytics · Read-only</p></div>
            </div>
            <button onClick={newChat} className="rounded-xl p-2 text-gray-500 hover:bg-orange-50 hover:text-orange-600 md:hidden"><Plus className="h-5 w-5" /></button>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            <div className="mx-auto w-full max-w-6xl space-y-6">
              {isHistoryLoading && activeId ? Array.from({ length: 3 }).map((_, i) => <div key={i} className={`h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-neutral-800 ${i % 2 ? "ml-auto w-2/3" : "w-4/5"}`} />) : messages.map((message, index) => (
                <div key={message._id || index} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "assistant" ? "bg-orange-500" : "bg-gray-800 dark:bg-neutral-700"}`}>{message.role === "assistant" ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}</div>
                  <div className={message.role === "user" ? "max-w-[85%] text-right" : "min-w-0 flex-1"}>
                    <div className={`rounded-2xl px-4 py-3 text-left text-sm leading-6 ${message.role === "user" ? "inline-block rounded-tr-sm bg-orange-500 text-white" : "block w-full rounded-tl-sm border border-gray-200 bg-gray-50 text-gray-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"}`}>
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              table: ({ ...props }) => (
                                <div className="my-4 w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                                  <table className="w-full min-w-[760px] border-collapse text-left text-xs sm:text-sm" {...props} />
                                </div>
                              ),
                              thead: ({ ...props }) => <thead className="bg-orange-50 text-gray-900 dark:bg-orange-950/30 dark:text-orange-100" {...props} />,
                              th: ({ ...props }) => <th className="whitespace-nowrap border-b border-r border-gray-200 px-4 py-3 font-semibold last:border-r-0 dark:border-neutral-700" {...props} />,
                              td: ({ ...props }) => <td className="border-b border-r border-gray-100 px-4 py-3 align-top leading-5 last:border-r-0 dark:border-neutral-800" {...props} />,
                              tr: ({ ...props }) => <tr className="even:bg-gray-50/80 hover:bg-orange-50/50 dark:even:bg-neutral-800/50 dark:hover:bg-orange-950/20" {...props} />,
                              p: ({ ...props }) => <p className="my-2 first:mt-0 last:mb-0" {...props} />,
                              ul: ({ ...props }) => <ul className="my-2 space-y-1 pl-5" {...props} />,
                              ol: ({ ...props }) => <ol className="my-2 space-y-1 pl-5" {...props} />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : <span className="whitespace-pre-wrap">{message.content}</span>}
                    </div>
                    <div className="mt-1 px-1 text-[10px] text-gray-400">{formatTime(message.createdAt)}</div>
                  </div>
                </div>
              ))}
              {messages.length === 1 && !isHistoryLoading && <div className="grid gap-2 pt-2 sm:grid-cols-2">{suggestions.map((item) => <button key={item} onClick={() => void sendMessage(item)} className="rounded-xl border border-gray-200 p-3 text-left text-xs text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-orange-800 dark:hover:bg-orange-950/20">{item}</button>)}</div>}
              {isLoading && <div className="flex items-center gap-3 text-sm text-gray-400"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500"><Bot className="h-4 w-4 text-white" /></div><Loader2 className="h-4 w-4 animate-spin" /> Analysing your data…</div>}
              <div ref={bottomRef} />
            </div>
          </section>

          <footer className="shrink-0 px-3 pb-3 sm:px-6">
            <div className="mx-auto flex max-w-6xl items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg focus-within:border-orange-400 dark:border-neutral-700 dark:bg-neutral-950"><textarea ref={inputRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(input); } }} disabled={isLoading} placeholder="Ask WareFlow AI…" className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none" /><button onClick={() => void sendMessage(input)} disabled={isLoading || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"><SendHorizonal className="h-4 w-4" /></button></div>
            <p className="pt-1.5 text-center text-[10px] text-gray-400">WareFlow AI may make mistakes. Verify critical data.</p>
          </footer>
        </main>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDialogBusy) setDialog(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="conversation-dialog-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-start gap-3 px-5 pb-3 pt-5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${dialog.type === "delete" ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"}`}>
                {dialog.type === "delete" ? <AlertTriangle className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="conversation-dialog-title" className="text-base font-semibold text-gray-900 dark:text-white">{dialog.type === "delete" ? "Delete conversation?" : "Rename conversation"}</h2>
                <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-neutral-400">{dialog.type === "delete" ? "This chat and all of its messages will be permanently removed." : "Use a clear name so this conversation is easy to find later."}</p>
              </div>
              <button onClick={() => setDialog(null)} disabled={isDialogBusy} aria-label="Close dialog" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-neutral-800 dark:hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            <div className="px-5 pb-5">
              {dialog.type === "rename" ? (
                <form onSubmit={(event) => { event.preventDefault(); void renameConversation(); }}>
                  <label htmlFor="conversation-title" className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-neutral-300">Chat name</label>
                  <input ref={renameInputRef} id="conversation-title" value={renameTitle} maxLength={100} onChange={(event) => { setRenameTitle(event.target.value); setDialogError(""); }} disabled={isDialogBusy} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-orange-500 dark:focus:ring-orange-950" />
                  <div className="mt-1.5 flex justify-between text-[11px]"><span className="text-red-500">{dialogError}</span><span className="text-gray-400">{renameTitle.length}/100</span></div>
                  <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDialog(null)} disabled={isDialogBusy} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Cancel</button><button type="submit" disabled={isDialogBusy || !renameTitle.trim()} className="flex min-w-24 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">{isDialogBusy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button></div>
                </form>
              ) : (
                <>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 dark:border-neutral-800 dark:bg-neutral-950"><p className="truncate text-sm font-medium text-gray-800 dark:text-neutral-100">{dialog.conversation.title}</p><p className="mt-0.5 text-xs text-gray-400">{dialog.conversation.messageCount || 0} messages</p></div>
                  {dialogError && <p className="mt-2 text-xs text-red-500">{dialogError}</p>}
                  <div className="mt-5 flex justify-end gap-2"><button onClick={() => setDialog(null)} disabled={isDialogBusy} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Keep chat</button><button onClick={() => void deleteConversation()} disabled={isDialogBusy} className="flex min-w-28 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{isDialogBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete chat</button></div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </>
    </AdminLayout>
  );
}
