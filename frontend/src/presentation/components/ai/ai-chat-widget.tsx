"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
};

const SUGGESTED_QUESTIONS = [
  "Quelles sont les formules d'abonnement ?",
  "Pourquoi le pass Platinum se termine le 15 juin ?",
  "Comment fonctionne l'inscription pour les mineurs ?",
  "Quelle est la différence entre Gold et Platinum ?",
  "Comment accéder aux sessions Live ?",
];

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:5000/chat";

export function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Bonjour ! 👋 Je suis l'assistant IA de Karini. Je peux répondre à toutes vos questions sur les cours, les abonnements, les sessions Live ou le système éducatif tunisien. Que souhaitez-vous savoir ?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input.trim();
    if (!textToSend || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput("");
    setIsTyping(true);
    setServerError(null);

    try {
      const res = await fetch(AI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-4).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status})`);
      }

      const data = await res.json();
      const botReply = data.reply || "Désolé, je n'ai pas pu générer de réponse.";

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: botReply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      console.warn("Karini AI fetch failed:", err);
      setServerError(
        "Impossible de joindre le serveur IA local. Assurez-vous d'avoir lancé `python server.py` dans le dossier Ai."
      );
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "Oups ! Je n'arrive pas à joindre le serveur IA local. Pour l'activer, ouvrez un terminal dans le dossier Ai et exécutez :\n`python server.py`",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center">
        {!isOpen && (
          <div className="mr-3 hidden sm:flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-md border border-slate-200/80 animate-fade-in">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Besoin d&apos;aide ? <strong>Posez vos questions à Karini IA</strong></span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Assistant IA Karini"
          className="group relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #06b6d4 100%)",
            boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
          }}
        >
          {isOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                <rect x="3" y="8" width="18" height="12" rx="4" />
                <circle cx="9" cy="14" r="1.5" fill="currentColor" />
                <circle cx="15" cy="14" r="1.5" fill="currentColor" />
                <path d="M9 18h6" />
              </svg>
              {/* Notification pulse dot */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white" />
              </span>
            </>
          )}
        </button>
      </div>

      {/* Chat Window Modal */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 flex h-[580px] w-[calc(100vw-2rem)] sm:w-[420px] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-xl animate-fade-in-up"
          style={{
            boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 text-white"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 70%, #06b6d4 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-xl border border-white/20">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-serif text-sm font-bold tracking-wide">Karini Assistant IA</h3>
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-xs" title="En ligne" />
                </div>
                <p className="text-[11px] text-white/80">Support élèves • Système tunisien</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: "welcome",
                      sender: "bot",
                      text: "Conversation réinitialisée ! Comment puis-je vous aider ?",
                      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    },
                  ])
                }
                title="Effacer l'historique"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors"
              >
                🔄
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-xs shadow-sm"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-xs"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-3 border border-slate-200/80 shadow-xs w-20">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Questions */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Questions fréquentes :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] text-indigo-700 font-medium border border-indigo-200 hover:bg-indigo-50 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="p-3 bg-white border-t border-slate-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Posez votre question à Karini..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 rounded-2xl px-4 py-2.5 text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
