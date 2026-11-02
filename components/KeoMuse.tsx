"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { ModalDialog } from "@/components/ModalDialog";
import { ChatRichText } from "@/components/ChatRichText";
import { ChatProductCard, type ChatProductCardData } from "@/components/ChatProductCard";
import { DEFAULT_AI_WELCOME } from "@/lib/ai-settings";
import { useMotionPreference } from "@/components/MotionProvider";
import type { MuseReply } from "@/lib/muse-core";

type Message = { id: number; role: "user" | "assistant"; text: string; reply?: MuseReply & { cards?: ChatProductCardData[] } };
const ideas = [{ title: "Find my signature", detail: "A little help choosing", prompt: "Help me choose a texture and length for my next look." }, { title: "Explore the collection", detail: "Products, options & prices", prompt: "What hair products can I browse?" }, { title: "Delivery & ordering", detail: "Before you commit", prompt: "How do I order, and how does delivery work?" }];
function sessionId() {
  try { const stored = sessionStorage.getItem("keo-muse-session"); if (stored) return stored; const id = crypto.randomUUID(); sessionStorage.setItem("keo-muse-session", id); return id; } catch { return "session-unavailable"; }
}

export function KeoMuse() {
  const pathname = usePathname();
  const { reduced } = useMotionPreference();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [welcome, setWelcome] = useState(DEFAULT_AI_WELCOME);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState("");
  const sequence = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const publicRoute = !pathname.startsWith("/admin");

  useEffect(() => {
    if (!publicRoute) return;
    const controller = new AbortController();
    fetch("/api/chat/config", { cache: "no-store", signal: controller.signal }).then(r => r.ok ? r.json() : null).then(config => {
      if (!config) return;
      setEnabled(config.enabled !== false);
      if (typeof config.welcomeMessage === "string" && config.welcomeMessage.trim()) setWelcome(config.welcomeMessage);
    }).catch(() => {});
    return () => controller.abort();
  }, [publicRoute]);
  useEffect(() => {
    if (!publicRoute || !enabled) { setOpen(false); return; }
    const listener = (event: Event) => { event.preventDefault(); setOpen(true); const prompt = (event as CustomEvent<string>).detail; if (prompt) setInput(prompt.slice(0, 1000)); };
    window.addEventListener("keo-muse-open", listener);
    return () => window.removeEventListener("keo-muse-open", listener);
  }, [enabled, publicRoute]);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const log = logRef.current;
    log?.scrollTo({ top: log.scrollHeight, behavior: reduced ? "instant" : "smooth" });
  }, [messages, waiting, open, reduced]);

  function stop() { requestRef.current?.abort(); requestRef.current = null; setWaiting(false); }
  function clear() { stop(); setMessages([]); setInput(""); setError(""); setRetry(""); inputRef.current?.focus(); }
  async function send(raw: string, retrying = false) {
    const message = raw.trim();
    if (!message || waiting || requestRef.current) return;
    const controller = new AbortController(); requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 28_000);
    const history = messages.filter((m, i) => !(retrying && i === messages.length - 1 && m.role === "user")).slice(-8).map(m => ({ role: m.role, text: m.text.slice(0, 2000) }));
    if (!retrying) setMessages(current => [...current, { id: ++sequence.current, role: "user", text: message }]);
    setInput(""); setWaiting(true); setError(""); setRetry("");
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "x-keo-session": sessionId() }, body: JSON.stringify({ message, history }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok || typeof data.text !== "string") throw new Error("unavailable");
      if (requestRef.current !== controller) return;
      setMessages(current => [...current, { id: ++sequence.current, role: "assistant", text: data.text, reply: data }]);
    } catch {
      if (requestRef.current !== controller) return;
      setError(controller.signal.aborted ? "That reply took too long. Try again, or contact the team." : "We couldn’t get a reply. Your question is still here — try again or contact the team.");
      setRetry(message);
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) { requestRef.current = null; setWaiting(false); }
    }
  }
  const submit = (event: FormEvent) => { event.preventDefault(); void send(input); };
  if (!publicRoute || !enabled) return null;
  return <>
    <button type="button" className="muse-launcher" onClick={() => setOpen(true)} aria-label="Open KEO Muse, your AI hair guide" aria-haspopup="dialog"><span className="muse-spark" aria-hidden="true">✦</span><span><b>KEO Muse</b><small>Your hair guide</small></span><span className="muse-launcher-arrow" aria-hidden="true">↗</span></button>
    <ModalDialog open={open} onClose={() => setOpen(false)} label="KEO Muse, AI hair guide" className="muse-dialog">
      <header className="muse-header"><div className="muse-avatar" aria-hidden="true">m.</div><div><strong>KEO Muse</strong><span>Your AI hair guide</span></div><button type="button" className="muse-icon-button" aria-label="Close KEO Muse" onClick={() => setOpen(false)}>×</button></header>
      <div className="muse-conversation" ref={logRef}>
        {!messages.length ? <div className="muse-welcome"><span className="eyebrow">A LITTLE INSPIRATION, JUST FOR YOU</span><h2>Your next look<br />starts with <em>a hello.</em></h2><p>{welcome}</p><div className="muse-ideas">{ideas.map(idea => <button key={idea.title} type="button" onClick={() => void send(idea.prompt)}><span><b>{idea.title}</b><small>{idea.detail}</small></span><span aria-hidden="true">↗</span></button>)}</div></div> : <div className="muse-log" role="log" aria-label="Conversation with KEO Muse" aria-live="polite" aria-relevant="additions">{messages.map(message => <div key={message.id} className={`muse-message is-${message.role}`}><span className="muse-message-label">{message.role === "user" ? "You" : "KEO Muse"}{message.reply?.mode === "ai" ? " · AI" : message.reply ? " · Saved answer" : ""}</span><div className="muse-message-text"><ChatRichText text={message.text} allowedUrls={message.reply?.allowedUrls || []} onNavigate={() => setOpen(false)} /></div>{message.reply?.cards?.map(card => <ChatProductCard key={card.id} card={card} onNavigate={() => setOpen(false)} />)}{message.reply?.actions?.length ? <div className="muse-actions">{message.reply.actions.map(action => <a key={action.href} href={action.href} target={action.kind === "whatsapp" ? "_blank" : undefined} rel={action.kind === "whatsapp" ? "noopener noreferrer" : undefined} onClick={() => setOpen(false)}>{action.label} <span aria-hidden="true">↗</span></a>)}</div> : null}{message.reply?.notice && <small className="muse-notice">{message.reply.notice}</small>}</div>)}</div>}
        {waiting && <div className="muse-thinking" role="status"><span /><span /><span /><span className="sr-only">KEO Muse is preparing a reply</span></div>}
        {error && <div className="muse-error" role="alert"><p>{error}</p>{retry && <button type="button" onClick={() => void send(retry, true)}>Retry question ↗</button>}<a href="/contact">Contact the team</a></div>}
      </div>
      <div className="muse-composer"><form onSubmit={submit} noValidate><label className="sr-only" htmlFor="muse-question">Your question</label><textarea id="muse-question" ref={inputRef} rows={2} value={input} maxLength={1000} placeholder="A texture, a length, a little advice…" onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(input); } }} />{waiting ? <button className="muse-send" type="button" aria-label="Stop reply" onClick={() => { stop(); setError("Reply stopped. You can ask another question."); setRetry(""); }}>■</button> : <button className="muse-send" type="submit" disabled={!input.trim()} aria-label="Send question">↑</button>}</form><div className="muse-composer-meta"><button type="button" onClick={clear} disabled={!messages.length}>New conversation</button><span>{input.length}/1000</span></div></div>
      <footer className="muse-disclosure">AI can make mistakes. Confirm orders with the team. Avoid sensitive details. <a href="/privacy">Privacy</a></footer>
    </ModalDialog>
  </>;
}
