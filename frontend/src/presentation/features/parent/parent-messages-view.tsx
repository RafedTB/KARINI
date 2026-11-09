"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Conversation, Message } from "@/domain/entities/messaging";
import type { ParentChild, ParentTeacher } from "@/domain/entities/parent-dashboard";
import { MembershipType } from "@/domain/enums";
import { messagingService } from "@/application/services/messaging-service";
import { parentService } from "@/application/services/parent-service";
import { useAuth } from "@/presentation/providers/auth-provider";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { getMessagingSocket } from "@/infrastructure/socket/socket-client";

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("fr-TN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  }).format(new Date(value));
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-TN", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Tunis",
  }).format(new Date(value));
}

function teacherLabel(conversation: Conversation): string {
  return conversation.teacherName?.trim() || "Enseignant";
}

export function ParentMessagesView() {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [teachers, setTeachers] = useState<ParentTeacher[]>([]);
  const [composerChildId, setComposerChildId] = useState<number | null>(null);
  const [composerTeacherId, setComposerTeacherId] = useState<number | null>(null);
  const [composerSubject, setComposerSubject] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerLoading, setComposerLoading] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [hasPlatinumChild, setHasPlatinumChild] = useState<boolean | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      setListError(null);
      const result = await messagingService.listConversations(token);
      setConversations(result);
      setSelectedId((current) => current ?? result[0]?.id ?? null);
    } catch (cause: unknown) {
      setListError(cause instanceof Error ? cause.message : "Impossible de charger vos conversations.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadMessages = useCallback(async (conversationId: number, silent = false) => {
    if (!token) return;
    try {
      if (!silent) setLoadingMessages(true);
      setError(null);
      const result = await messagingService.listMessages(token, conversationId);
      setMessages(result);
      await messagingService.markAsRead(token, conversationId);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
        ),
      );
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les messages.");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(loadConversations);
  }, [loadConversations]);

  useEffect(() => {
    if (!token) return;
    void parentService.listChildren(token)
      .then((result) => {
        setChildren(result);
        setHasPlatinumChild(result.some((child) => child.membership?.toLowerCase() === MembershipType.PLATINUM));
      })
      .catch(() => setHasPlatinumChild(false));
  }, [token]);

  useEffect(() => {
    if (selectedId !== null) void Promise.resolve().then(() => loadMessages(selectedId));
  }, [loadMessages, selectedId]);

  // WebSocket real-time subscription
  useEffect(() => {
    if (!token) return;
    const socket = getMessagingSocket(token);
    if (!socket) return;

    const onConnect = () => setWsConnected(true);
    const onDisconnect = () => setWsConnected(false);

    if (socket.connected) {
      setWsConnected(true);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const handleNewMessage = (newMessage: Message) => {
      if (newMessage.conversationId === selectedId) {
        setMessages((current) => {
          if (current.some((item) => item.id === newMessage.id)) return current;
          const pendingIdx = current.findIndex(
            (item) => item.pending && item.body === newMessage.body && item.senderId === newMessage.senderId,
          );
          if (pendingIdx !== -1) {
            const copy = [...current];
            copy[pendingIdx] = newMessage;
            return copy;
          }
          return [...current, newMessage];
        });

        if (newMessage.senderId !== user?.id) {
          socket.emit("markAsRead", { conversationId: selectedId });
        }
      }

      setConversations((current) => {
        const updated = current.map((conv) => {
          if (conv.id === newMessage.conversationId) {
            const isCurrent = conv.id === selectedId;
            return {
              ...conv,
              lastMessage: newMessage.body,
              lastMessageAt: newMessage.createdAt,
              unreadCount: isCurrent || newMessage.senderId === user?.id ? 0 : (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        });

        return updated.sort((a, b) => {
          const tA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tB - tA;
        });
      });
    };

    const handleMessagesRead = (data: { conversationId: number; readBy: number }) => {
      if (data.conversationId === selectedId) {
        setMessages((current) => current.map((m) => ({ ...m, isRead: true })));
      }
      setConversations((current) =>
        current.map((c) => (c.id === data.conversationId ? { ...c, unreadCount: 0 } : c)),
      );
    };

    const handleConversationUpdated = (data: {
      conversationId: number;
      lastMessage: string;
      lastMessageAt: string;
      senderId: number;
    }) => {
      setConversations((current) => {
        const found = current.some((c) => c.id === data.conversationId);
        if (!found) {
          void loadConversations();
          return current;
        }
        const updated = current.map((c) => {
          if (c.id === data.conversationId) {
            return {
              ...c,
              lastMessage: data.lastMessage,
              lastMessageAt: data.lastMessageAt,
              unreadCount: c.id === selectedId ? 0 : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        });
        return updated.sort((a, b) => {
          const tA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tB - tA;
        });
      });
    };

    const handleTyping = (data: { conversationId: number; userId: number; isTyping: boolean }) => {
      if (data.conversationId === selectedId && data.userId !== user?.id) {
        setIsOtherTyping(data.isTyping);
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("conversationUpdated", handleConversationUpdated);
    socket.on("typing", handleTyping);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("conversationUpdated", handleConversationUpdated);
      socket.off("typing", handleTyping);
    };
  }, [token, selectedId, user?.id, loadConversations]);

  // Join/leave conversation room
  useEffect(() => {
    if (!token || selectedId === null) return;
    const socket = getMessagingSocket(token);
    if (!socket) return;

    socket.emit("joinConversation", { conversationId: selectedId });
    setIsOtherTyping(false);

    return () => {
      socket.emit("leaveConversation", { conversationId: selectedId });
    };
  }, [token, selectedId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleBodyChange = (value: string) => {
    setBody(value);
    if (!token || selectedId === null) return;
    const socket = getMessagingSocket(token);
    if (socket && socket.connected) {
      socket.emit("typing", { conversationId: selectedId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { conversationId: selectedId, isTyping: false });
      }, 2000);
    }
  };

  const send = async () => {
    const trimmed = body.trim();
    if (!token || selectedId === null || !trimmed || sending) return;
    const temporaryId = `pending-${Date.now()}`;
    const optimistic: Message = {
      id: temporaryId,
      conversationId: selectedId,
      senderId: user?.id ?? 0,
      body: trimmed,
      isRead: true,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((current) => [...current, optimistic]);
    setBody("");
    setSending(true);

    const socket = getMessagingSocket(token);
    if (socket && socket.connected) {
      socket.emit("typing", { conversationId: selectedId, isTyping: false });
    }

    try {
      if (socket && socket.connected) {
        await new Promise<Message>((resolve, reject) => {
          socket.emit(
            "sendMessage",
            { conversationId: selectedId, body: trimmed },
            (res: { event?: string; message?: Message; error?: string }) => {
              if (res?.error) {
                reject(new Error(res.error));
              } else if (res?.message) {
                resolve(res.message);
              } else {
                resolve(optimistic);
              }
            },
          );
          setTimeout(() => resolve(optimistic), 3000);
        }).then((sentMessage) => {
          if (sentMessage && sentMessage.id !== temporaryId) {
            setMessages((current) => current.map((m) => (m.id === temporaryId ? sentMessage : m)));
          }
        });
      } else {
        const sent = await messagingService.sendMessage(token, selectedId, { body: trimmed });
        setMessages((current) => current.map((message) => (message.id === temporaryId ? sent : message)));
      }
    } catch (cause: unknown) {
      setMessages((current) =>
        current.map((message) =>
          message.id === temporaryId ? { ...message, pending: false, failed: true } : message,
        ),
      );
      setError(cause instanceof Error ? cause.message : "Envoi impossible. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  const retry = (message: Message) => {
    setMessages((current) => current.filter((item) => item.id !== message.id));
    setBody(message.body);
  };

  const openComposer = async () => {
    if (!token) return;
    setComposerError(null);
    try {
      const result = children.length > 0 ? children : await parentService.listChildren(token);
      const eligibleChildren = result.filter((child) => child.membership?.toLowerCase() === MembershipType.PLATINUM);
      setChildren(eligibleChildren);
      setHasPlatinumChild(eligibleChildren.length > 0);
      const firstChild = eligibleChildren[0];
      if (!firstChild) {
        setComposerError("La messagerie parent est réservée aux parents d’élèves Platinum.");
        return;
      }
      setComposerOpen(true);
      if (firstChild) {
        setComposerChildId(firstChild.id);
        const availableTeachers = await parentService.listTeachers(token, firstChild.id);
        setTeachers(availableTeachers);
        setComposerTeacherId(availableTeachers[0]?.id ?? null);
        setComposerSubject(availableTeachers[0]?.subject ?? "");
      }
    } catch {
      setComposerError("Impossible de charger les enseignants disponibles.");
    }
  };

  const selectComposerChild = async (childId: number) => {
    if (!token) return;
    setComposerChildId(childId);
    try {
      const availableTeachers = await parentService.listTeachers(token, childId);
      setTeachers(availableTeachers);
      setComposerTeacherId(availableTeachers[0]?.id ?? null);
      setComposerSubject(availableTeachers[0]?.subject ?? "");
    } catch {
      setTeachers([]);
      setComposerTeacherId(null);
      setComposerSubject("");
    }
  };

  const createConversation = async () => {
    if (!token || composerChildId === null || composerTeacherId === null || !composerSubject.trim()) return;
    setComposerLoading(true);
    setComposerError(null);
    try {
      const conversation = await messagingService.createConversation(token, {
        studentId: composerChildId,
        teacherId: composerTeacherId,
        subject: composerSubject.trim(),
      });
      if (composerBody.trim()) {
        await messagingService.sendMessage(token, conversation.id, { body: composerBody.trim() });
      }
      setComposerOpen(false);
      setComposerBody("");
      await loadConversations();
      setSelectedId(conversation.id);
      await loadMessages(conversation.id);
    } catch (cause: unknown) {
      setComposerError(cause instanceof Error ? cause.message : "Impossible de créer la conversation.");
    } finally {
      setComposerLoading(false);
    }
  };

  if (loading) return <PageLoader label="Chargement de vos conversations…" />;

  return (
    <div className="animate-fade-in-up space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-accent text-xs font-bold uppercase tracking-wider">Communication</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                wsConnected ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {wsConnected ? "WebSocket connecté" : "Connexion…"}
            </span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold" style={{ color: "var(--ink)" }}>Messages Parents</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Échangez en direct avec les enseignants de votre enfant.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPlatinumChild !== false && (
            <button type="button" onClick={() => void openComposer()} className="btn-primary rounded-xl text-sm font-semibold">
              + Nouvelle conversation
            </button>
          )}
          <Link href="/parent" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">← Retour au suivi</Link>
        </div>
      </header>

      {hasPlatinumChild === false && (
        <div className="glass-card flex min-h-[520px] items-center justify-center rounded-3xl p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl" aria-hidden="true">
              💎
            </div>
            <h2 className="mt-5 font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
              Passez à Platinum pour envoyer des messages
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--muted)" }}>
              La messagerie directe avec les enseignants est disponible uniquement pour les parents d&apos;élèves Platinum.
            </p>
            <Link href="/membership" className="btn-primary mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-bold">
              Découvrir Platinum 💎
            </Link>
          </div>
        </div>
      )}

      <div className={`${hasPlatinumChild === false ? "hidden " : ""}glass-card grid min-h-[520px] overflow-hidden rounded-3xl md:grid-cols-[minmax(220px,32%)_1fr]`}>
        <aside className={`border-slate-200 md:border-r ${selectedConversation ? "hidden md:block" : "block"}`}>
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-serif text-lg font-bold" style={{ color: "var(--ink)" }}>Conversations</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{conversations.length} discussion(s)</p>
          </div>
          {listError ? (
            <div className="p-5 text-center text-sm text-rose-600" role="alert">
              <p>{listError}</p>
              <button type="button" onClick={() => void loadConversations()} className="mt-3 font-semibold underline">Réessayer</button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-3xl" aria-hidden="true">💬</p>
              <p className="mt-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>Aucune conversation</p>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                {hasPlatinumChild === false
                  ? "La messagerie est réservée aux parents d’élèves Platinum."
                  : "Les enseignants disponibles apparaîtront ici."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full p-4 text-left transition-colors hover:bg-indigo-50/60 ${selectedId === conversation.id ? "bg-indigo-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>{teacherLabel(conversation)}</span>
                    {conversation.unreadCount > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" aria-label="Non lu" />}
                  </div>
                  <p className="mt-1 text-xs text-indigo-600">{conversation.subject || "Suivi pédagogique"}</p>
                  <p className="mt-2 truncate text-xs" style={{ color: "var(--muted)" }}>{conversation.lastMessage || "Nouvelle conversation"}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{formatDate(conversation.lastMessageAt)}</p>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className={`flex min-w-0 flex-col ${selectedConversation ? "flex" : "hidden md:flex"}`}>
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <p className="text-4xl" aria-hidden="true">✉️</p>
                <p className="mt-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>Sélectionnez une conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setSelectedId(null)} className="rounded-lg p-2 text-slate-500 hover:bg-black/5 md:hidden" aria-label="Retour aux conversations">←</button>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-sm font-bold text-white">
                    {teacherLabel(selectedConversation).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: "var(--ink)" }}>{teacherLabel(selectedConversation)}</h2>
                    <p className="text-xs text-indigo-600">{selectedConversation.subject || "Suivi pédagogique"}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">
                  {wsConnected ? "⚡ En direct" : ""}
                </span>
              </div>
              <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
                {loadingMessages ? <p className="text-center text-sm text-slate-400">Chargement…</p> : messages.length === 0 ? (
                  <p className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>Commencez la conversation avec l&apos;enseignant.</p>
                ) : messages.map((message) => {
                  const mine = message.senderId === user?.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${mine ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md bg-slate-100 text-slate-700"}`}>
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <div className={`mt-1 flex items-center justify-end gap-2 text-[10px] ${mine ? "text-indigo-100" : "text-slate-400"}`}>
                          <span>{formatTime(message.createdAt)}</span>
                          {mine && (
                            <span title={message.isRead ? "Lu" : "Envoyé"}>
                              {message.isRead ? "✓✓" : "✓"}
                            </span>
                          )}
                          {message.failed && <button type="button" onClick={() => retry(message)} className="font-bold underline">Réessayer</button>}
                          {message.pending && <span>Envoi…</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {isOtherTyping && (
                <div className="px-4 py-1 text-xs italic text-slate-500 animate-pulse">
                  {teacherLabel(selectedConversation)} est en train d&apos;écrire…
                </div>
              )}
              {error && <p className="px-4 text-xs text-rose-600" role="alert">{error}</p>}
              <form
                className="border-t border-slate-200 p-3 sm:p-4"
                onSubmit={(event) => { event.preventDefault(); void send(); }}
              >
                <div className="flex items-end gap-2">
                  <textarea
                    value={body}
                    onChange={(event) => handleBodyChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    rows={2}
                    maxLength={2000}
                    placeholder="Écrire un message en direct…"
                    aria-label="Message à envoyer"
                    className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button type="submit" disabled={!body.trim() || sending} className="btn-primary rounded-xl px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50" aria-label="Envoyer le message">
                    ↑
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</p>
              </form>
            </>
          )}
        </section>
      </div>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" role="dialog" aria-modal="true" aria-labelledby="new-conversation-title">
          <div className="glass-card w-full max-w-lg rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="new-conversation-title" className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>Nouvelle conversation</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Écrivez à un enseignant assigné à votre enfant.</p>
              </div>
              <button type="button" onClick={() => setComposerOpen(false)} aria-label="Fermer" className="text-xl text-slate-400">×</button>
            </div>
            <div className="mt-5 space-y-4">
              {composerError && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{composerError}</p>}
              <label className="block text-sm font-semibold">Enfant
                <select value={composerChildId ?? ""} onChange={(event) => void selectComposerChild(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal">
                  {children.map((child) => <option key={child.id} value={child.id}>{[child.firstname, child.lastname].filter(Boolean).join(" ") || child.username}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">Enseignant
                <select value={composerTeacherId ?? ""} onChange={(event) => {
                  const teacherId = Number(event.target.value);
                  const teacher = teachers.find((item) => item.id === teacherId);
                  setComposerTeacherId(teacherId);
                  setComposerSubject(teacher?.subject ?? "");
                }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal" disabled={teachers.length === 0}>
                  {teachers.map((teacher) => <option key={`${teacher.id}-${teacher.subject}`} value={teacher.id}>{teacher.name} — {teacher.subject}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">Message
                <textarea value={composerBody} onChange={(event) => setComposerBody(event.target.value)} rows={4} maxLength={2000} placeholder="Votre message..." className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 font-normal" />
              </label>
              {teachers.length === 0 && <p className="text-sm text-amber-700">Aucun enseignant assigné à cette classe.</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setComposerOpen(false)} className="btn-secondary rounded-xl text-sm">Annuler</button>
                <button type="button" onClick={() => void createConversation()} disabled={composerLoading || !composerBody.trim() || composerTeacherId === null} className="btn-primary rounded-xl text-sm disabled:opacity-50">
                  {composerLoading ? "Envoi…" : "Démarrer la conversation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
