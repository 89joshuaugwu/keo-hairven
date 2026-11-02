"use client";
import { ChatRichText } from "@/components/ChatRichText";
import { ChatProductCard, type ChatProductCardData } from "@/components/ChatProductCard";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePublicBusiness } from "@/components/PublicBusinessProvider";
import { generalEnquiryFor } from "@/lib/site";

type ChatRole = "user" | "assistant";
type ChatAction = { label: string; href: string; kind?: "link" | "whatsapp" };
type ChatMessage = { id: string; role: ChatRole; text: string; actions?: ChatAction[]; cards?: ChatProductCardData[]; allowedUrls?: string[]; mode?: "ai" | "faq" | "fallback" };

type ApiResponse = {
  text?: string;
  mode?: "ai" | "faq" | "fallback";
  actions?: ChatAction[]; cards?: ChatProductCardData[]; allowedUrls?: string[];
  message?: string;
};

const welcome: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I’m Ask KEO, the AI guide for KEO Hairven. I can help you explore products, styles, services and common questions.",
  mode: "faq",
};

const suggestions = [
  { label: "View prices", prompt: "What product prices can I view on the website?" },
  { label: "Find a style", prompt: "Help me find a style inspiration." },
  { label: "Waybill", prompt: "How does waybill work?" },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getSessionId() {
  if (typeof window === "undefined") return "server";
  const key = "zls-ai-session";
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : makeId();
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

export function AskZara() {
  const business = usePublicBusiness();
  const generalEnquiry = generalEnquiryFor(business.whatsappDigits, business.name);
  const [open, setOpen] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [assistantEnabled, setAssistantEnabled] = useState(true);
  const [welcomeText, setWelcomeText] = useState(welcome.text);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [offline, setOffline] = useState(false);
  const [footerNear, setFooterNear] = useState(false);
  const [footerLift, setFooterLift] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const historyForApi = useMemo(
    () => messages.filter((message) => message.id !== "welcome").slice(-8).map((message) => ({ role: message.role, text: message.text })),
    [messages]
  );

  useEffect(() => {
    let active = true;
    fetch("/api/chat/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("config")))
      .then((data: { enabled?: boolean; welcomeMessage?: string }) => {
        if (!active) return;
        const nextWelcome = typeof data.welcomeMessage === "string" && data.welcomeMessage.trim() ? data.welcomeMessage.trim() : welcome.text;
        setAssistantEnabled(data.enabled !== false);
        setWelcomeText(nextWelcome);
        setMessages((current) => current.length === 1 && current[0]?.id === "welcome" ? [{ ...current[0], text: nextWelcome }] : current);
      })
      .catch(() => { if (active) setAssistantEnabled(true); })
      .finally(() => { if (active) setConfigLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const openAssistant = () => setOpen(true);
    window.addEventListener("zls-open-assistant", openAssistant);
    return () => window.removeEventListener("zls-open-assistant", openAssistant);
  }, []);

  useEffect(() => {
    const footer = document.querySelector<HTMLElement>("[data-site-footer]");
    if (!footer) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = footer.getBoundingClientRect();
        const viewport = window.innerHeight || document.documentElement.clientHeight;
        const overlap = Math.max(0, viewport - rect.top);
        const near = overlap > 0;
        setFooterNear(near);
        // Keep the launcher/panel visibly above the footer content rather than
        // using a fixed jump that can still cover short footer links.
        setFooterLift(near ? Math.min(Math.max(overlap + 14, 48), 260) : 0);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    inputRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      launcherRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, open, waiting]);

  const sendMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text || waiting) return;
    if (text.length > 1000) return;

    const userMessage: ChatMessage = { id: makeId(), role: "user", text };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setWaiting(true);
    setOffline(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-zls-session": getSessionId(),
        },
        body: JSON.stringify({ message: text, history: historyForApi }),
      });
      const data = (await response.json()) as ApiResponse;
      const reply = data.text || data.message || "I couldn’t answer that just now. Please ask KEO on WhatsApp.";
      const mode = data.mode || "fallback";
      setMessages((current) => [...current, { id: makeId(), role: "assistant", text: reply, actions: data.actions, cards:data.cards, allowedUrls:data.allowedUrls, mode }]);
      setOffline(mode === "fallback");
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          text: "AI replies are temporarily unavailable. You can still use the saved answers or chat directly with KEO Hairven on WhatsApp.",
          actions: [{ label: "Chat on WhatsApp", href: generalEnquiry, kind: "whatsapp" }],
          mode: "fallback",
        },
      ]);
      setOffline(true);
    } finally {
      setWaiting(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const clearChat = () => {
    setMessages([{ ...welcome, text: welcomeText }]);
    setOffline(false);
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  if (!configLoaded || !assistantEnabled) return null;

  return (
    <>
      <button
        ref={launcherRef}
        className={`ask-zara-launcher${footerNear ? " is-footer-near" : ""}`}
        style={{ "--ask-zara-footer-lift": `${footerLift}px` } as React.CSSProperties}
        type="button"
        aria-expanded={open}
        aria-controls="ask-zara-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="ask-zara-brand-badge" aria-hidden="true">
          <Image src="/assets/brand/keo-hairven-icon.png" alt="" width={38} height={38} />
        </span>
        <span>Ask KEO</span>
      </button>

      {open && (
        <div id="ask-zara-panel" ref={panelRef} className="ask-zara-panel" style={{ "--ask-zara-footer-lift": `${footerLift}px` } as React.CSSProperties} role="dialog" aria-modal="true" aria-label="Ask KEO AI guide">
          <div className="ask-zara-head">
            <div className="ask-zara-head-title">
              <span className="ask-zara-head-logo" aria-hidden="true"><Image src="/assets/brand/keo-hairven-icon.png" alt="" width={34} height={34} /></span>
              <div><strong>Ask KEO</strong><small>{offline ? "Saved answers" : "AI guide"}</small></div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Ask KEO">×</button>
          </div>

          <div className="ask-zara-chatbody" aria-live="polite">
            <div className="ask-zara-privacy-note">
              <b>I’m an AI guide.</b> Please avoid sharing sensitive information. For confirmed bookings, stock and orders, chat with KEO Hairven. <Link href="/privacy">Privacy</Link>
            </div>

            {messages.map((message) => (
              <div key={message.id} className={`ask-zara-message-row ${message.role === "user" ? "is-user" : "is-assistant"}`}>
                <div className="ask-zara-bubble"><ChatRichText text={message.text} allowedUrls={message.allowedUrls||[]} onNavigate={()=>setOpen(false)}/></div>
                {message.cards?.map(card=><ChatProductCard key={card.id} card={card} onNavigate={()=>setOpen(false)}/>)}
                {message.actions && message.actions.length > 0 && (
                  <div className="ask-zara-message-actions">
                    {message.actions.map((action) => {
                      const external = action.kind === "whatsapp" || action.href.startsWith("http");
                      return external ? (
                        <a key={`${message.id}-${action.label}`} href={action.href} target="_blank" rel="noopener noreferrer" className="ask-zara-action-link">{action.label} <span aria-hidden="true">↗</span></a>
                      ) : (
                        <Link key={`${message.id}-${action.label}`} href={action.href} className="ask-zara-action-link" onClick={() => setOpen(false)}>{action.label} <span aria-hidden="true">→</span></Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {messages.length === 1 && (
              <div className="ask-zara-suggestions" aria-label="Suggested questions">
                {suggestions.map((item) => (
                  <button key={item.label} type="button" onClick={() => void sendMessage(item.prompt)}>{item.label}</button>
                ))}
              </div>
            )}

            {offline && (
              <div className="ask-zara-offline">
                <div className="eyebrow">SAVED ANSWERS</div>
                <h3>Let’s keep you moving.</h3>
                <Link href="/faq#faq-5">Where are you located? <span aria-hidden="true">→</span></Link>
                <Link href="/faq#faq-1">How do I order? <span aria-hidden="true">→</span></Link>
                <Link href="/faq#faq-4">Can you waybill to me? <span aria-hidden="true">→</span></Link>
              </div>
            )}

            {waiting && (
              <div className="ask-zara-waiting" role="status" aria-label="Zara is thinking">
                <span /><span /><span /><b className="sr-only">Zara is thinking</b>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="ask-zara-inputbar" onSubmit={onSubmit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 1000))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (input.trim()) void sendMessage(input);
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="Ask a question…"
              aria-label="Ask KEO a question"
            />
            <button type="submit" disabled={!input.trim() || waiting} aria-label="Send message">↑</button>
          </form>
          <div className="ask-zara-foot">
            <button type="button" onClick={clearChat}>Clear chat</button>
            <span aria-hidden="true">·</span>
            <a href={generalEnquiry} target="_blank" rel="noopener noreferrer">Talk to KEO Hairven on WhatsApp</a>
          </div>
        </div>
      )}
    </>
  );
}
