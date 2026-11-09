"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, TeacherConversation } from "@/domain/entities/messaging";
import { teacherMessagingRepository } from "@/infrastructure/repositories/teacher-messaging-repository";
import { useAuth } from "@/presentation/providers/auth-provider";
import { PageLoader } from "@/presentation/components/ui/page-loader";

const formatTime = (value: string) => new Intl.DateTimeFormat("fr-TN", {
  hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis",
}).format(new Date(value));

export function TeacherMessagesView() {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<TeacherConversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      setConversations(await teacherMessagingRepository.listConversations(token));
      setError(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les messages.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadMessages = useCallback(async (id: number) => {
    if (!token) return;
    try {
      setMessages(await teacherMessagingRepository.listMessages(token, id));
      await teacherMessagingRepository.markAsRead(token, id);
      setConversations((items) => items.map((item) => item.id === id ? { ...item, unreadCount: 0 } : item));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger cette conversation.");
    }
  }, [token]);

  useEffect(() => { void Promise.resolve().then(loadConversations); }, [loadConversations]);
  useEffect(() => {
    if (selectedId !== null) void Promise.resolve().then(() => loadMessages(selectedId));
  }, [loadMessages, selectedId]);
  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => {
      void loadConversations();
      if (selectedId !== null) void loadMessages(selectedId);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [loadConversations, loadMessages, selectedId, token]);
  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }); }, [messages]);

  const send = async () => {
    if (!token || selectedId === null || !body.trim()) return;
    const text = body.trim();
    setBody("");
    try {
      const message = await teacherMessagingRepository.sendMessage(token, selectedId, { body: text });
      setMessages((items) => [...items, message]);
    } catch (cause: unknown) {
      setBody(text);
      setError(cause instanceof Error ? cause.message : "Envoi impossible.");
    }
  };

  if (loading) return <PageLoader label="Chargement des messages…" />;
  const selected = conversations.find((item) => item.id === selectedId);

  return (
    <div className="space-y-5">
      <header>
        <span className="badge badge-accent text-xs font-bold uppercase tracking-wider">Communication</span>
        <h1 className="mt-3 font-serif text-3xl font-bold" style={{ color: "var(--ink)" }}>Messages Parents</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Répondez aux parents de vos élèves.</p>
      </header>
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
      <div className="glass-card grid min-h-[520px] overflow-hidden rounded-3xl md:grid-cols-[minmax(240px,32%)_1fr]">
        <aside className="border-slate-200 md:border-r">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-serif text-lg font-bold" style={{ color: "var(--ink)" }}>Conversations</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{conversations.length} discussion(s)</p>
          </div>
          {conversations.length === 0 ? (
            <p className="p-6 text-center text-sm" style={{ color: "var(--muted)" }}>Aucun message parent pour le moment.</p>
          ) : conversations.map((conversation) => (
            <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={`w-full border-b border-slate-100 p-4 text-left ${selectedId === conversation.id ? "bg-indigo-50" : "hover:bg-indigo-50/60"}`}>
              <div className="flex justify-between gap-2">
                <span className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>{conversation.parentName}</span>
                {conversation.unreadCount > 0 && <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" aria-label="Non lu" />}
              </div>
              <p className="mt-1 text-xs text-indigo-600">{conversation.studentName} · {conversation.subject}</p>
              <p className="mt-2 truncate text-xs" style={{ color: "var(--muted)" }}>{conversation.lastMessage || "Nouvelle conversation"}</p>
            </button>
          ))}
        </aside>
        <section className="flex min-w-0 flex-col">
          {!selected ? <div className="flex flex-1 items-center justify-center p-8 text-center text-sm" style={{ color: "var(--muted)" }}>Sélectionnez une conversation</div> : (
            <>
              <div className="border-b border-slate-200 p-4">
                <h2 className="text-sm font-bold" style={{ color: "var(--ink)" }}>{selected.parentName}</h2>
                <p className="text-xs text-indigo-600">{selected.studentName} · {selected.subject}</p>
              </div>
              <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message) => {
                  const mine = message.senderId === user?.id;
                  return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${mine ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}><p className="whitespace-pre-wrap">{message.body}</p><span className="mt-1 block text-right text-[10px] opacity-70">{formatTime(message.createdAt)}</span></div></div>;
                })}
              </div>
              <form className="border-t border-slate-200 p-3" onSubmit={(event) => { event.preventDefault(); void send(); }}>
                <div className="flex items-end gap-2">
                  <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={2} placeholder="Votre réponse..." className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm" />
                  <button type="submit" className="btn-primary rounded-xl px-4 py-3 text-sm font-semibold">Envoyer</button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
