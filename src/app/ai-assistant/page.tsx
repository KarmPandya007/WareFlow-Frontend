"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { getApiUrl } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import { Sparkles, SendHorizonal, RotateCcw, Bot, User, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "What is today's total revenue?",
  "Compare branch performance",
  "Which salesperson has the highest sales?",
  "Show payment mode breakdown",
  "How are targets progressing?",
  "Show this month's revenue trend",
  "Which product category sells the most?",
];

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm **WareFlow AI**, your intelligent business analytics assistant. 👋\n\nI can help you understand your store's performance. Ask me anything like:\n- *\"What is today's revenue?\"*\n- *\"Which branch is performing best?\"*\n- *\"How are salesperson targets progressing?\"*",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole")?.toLowerCase() ?? "";
    setUserRole(role);
    if (role !== "admin") {
      window.location.href = "/billing";
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessage: Message = {
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      // Build history from prior messages (exclude the greeting)
      const history = messages
        .slice(1) // skip initial greeting
        .map((m) => ({ role: m.role === "assistant" ? "model" : "user", content: m.content }));

      try {
        const res = await fetch(`${getApiUrl()}/api/ai/chat`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history }),
        });

        const data = await res.json();
        if (data.success) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.reply, timestamp: new Date() },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `⚠️ ${data.message ?? "An error occurred. Please try again."}`,
              timestamp: new Date(),
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Could not reach the AI assistant. Please check your connection and try again.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [isLoading, messages]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hello! I'm **WareFlow AI**, your intelligent business analytics assistant. 👋\n\nI can help you understand your store's performance. Ask me anything like:\n- *\"What is today's revenue?\"*\n- *\"Which branch is performing best?\"*\n- *\"How are salesperson targets progressing?\"*",
        timestamp: new Date(),
      },
    ]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 py-4 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">WareFlow AI</h1>
              <p className="text-xs text-gray-400">Analytics assistant · Read-only access</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>

        {/* Suggestion chips — shown only at start */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-full transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.role === "assistant"
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600"
                    : "bg-gradient-to-br from-gray-700 to-gray-900"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-table:border prose-td:border prose-th:border prose-td:px-2 prose-td:py-1 prose-th:px-2 prose-th:py-1 prose-table:text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 px-1">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                <span className="text-sm text-gray-400 italic">Analysing data…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex items-end gap-3 p-3">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask about revenue, branches, targets…"
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none max-h-32 leading-relaxed"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0"
          >
            <SendHorizonal className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-300 -mt-2">
          WareFlow AI may make mistakes. Always verify critical data in the dashboard.
        </p>
      </div>
    </AdminLayout>
  );
}
