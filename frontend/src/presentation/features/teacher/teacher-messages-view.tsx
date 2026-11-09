"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, TeacherConversation } from "@/domain/entities/messaging";
import { teacherMessagingRepository } from "@/infrastructure/repositories/teacher-messaging-repository";
import { useAuth } from "@/presentation/providers/auth-provider";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { getMessagingSocket } from "@/infrastructure/socket/socket-client";

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
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          if (current.some((m) => m.id === newMessage.id)) return current;
          return [...current, newMessage];
        });

        if (newMessage.senderId !== user?.id) {
          socket.emit("markAsRead", { conversationId: selectedId });
        }
      }

      setConversations((current) => {
        const updated = current.map((c) => {
          if (c.id === newMessage.conversationId) {
            const isCurrent = c.id === selectedId;
            return {
              ...c,
              lastMessage: newMessage.body,
              lastMessageAt: newMessage.createdAt,
              unreadCount: isCurrent || newMessage.senderId === user?.id ? 0 : (c.unreadCount || 0) + 1,
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

  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }); }, [messages]);

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
    if (!token || selectedId === null || !body.trim()) return;
    const text = body.trim();
    setBody("");

    const socket = getMessagingSocket(token);
    if (socket && socket.connected) {
      socket.emit("typing", { conversationId: selectedId, isTyping: false });
    }

    try {
      if (socket && socket.connected) {
        await new Promise<Message>((resolve, reject) => {
          socket.emit(
            "sendMessage",
            { conversationId: selectedId, body: text },
            (res: { event?: string; message?: Message; error?: string }) => {
              if (res?.error) {
                reject(new Error(res.error));
              } else if (res?.message) {
                resolve(res.message);
              } else {
                resolve({
                  id: Date.now(),
                  conversationId: selectedId,
                  senderId: user?.id ?? 0,
                  body: text,
                  isRead: true,
                  createdAt: new Date().toISOString(),
                });
              }
            },
          );
          setTimeout(() => {
            resolve({
              id: Date.now(),
              conversationId: selectedId,
              senderId: user?.id ?? 0,
              body: text,
              isRead: true,
              createdAt: new Date().toISOString(),
            });
          }, 3000);
        }).then((sentMessage) => {
          if (sentMessage) {
            setMessages((items) => {
              if (items.some((m) => m.id === sentMessage.id)) return items;
              return [...items, sentMessage];
            });
          }
        });
      } else {
        const message = await teacherMessagingRepository.sendMessage(token, selectedId, { body: text });
        setMessages((items) => [...items, message]);
      }
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
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Répondez en direct aux parents de vos élèves.</p>
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
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div>
                  <h2 className="text-sm font-bold" style={{ color: "var(--ink)" }}>{selected.parentName}</h2>
                  <p className="text-xs text-indigo-600">{selected.studentName} · {selected.subject}</p>
                </div>
                <span className="text-[11px] text-slate-400">
                  {wsConnected ? "⚡ En direct" : ""}
                </span>
              </div>
              <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message) => {
                  const mine = message.senderId === user?.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${mine ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                        <p className="whitespace-pre-wrap">{message.body}</p>
                        <div className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${mine ? "text-indigo-100" : "text-slate-400"}`}>
                          <span>{formatTime(message.createdAt)}</span>
                          {mine && (
                            <span title={message.isRead ? "Lu" : "Envoyé"}>
                              {message.isRead ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {isOtherTyping && (
                <div className="px-4 py-1 text-xs italic text-slate-500 animate-pulse">
                  Le parent est en train d&apos;écrire…
                </div>
              )}
              <form className="border-t border-slate-200 p-3" onSubmit={(event) => { event.preventDefault(); void send(); }}>
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
                    placeholder="Votre réponse en direct..."
                    className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm"
                  />
                  <button type="submit" disabled={!body.trim()} className="btn-primary rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50">Envoyer</button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
