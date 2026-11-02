"use client";
import Link from "next/link";
import { parseChatLinks } from "@/lib/chat-links";
export function ChatRichText({ text, allowedUrls, onNavigate }: {
    text: string;
    allowedUrls: string[];
    onNavigate: () => void;
}) { return <>{parseChatLinks(text, allowedUrls).map((s, i) => !s.href ? <span key={i}>{s.text}</span> : s.href.startsWith("/") ? <Link key={i} href={s.href} onClick={onNavigate}>{s.text}</Link> : <a key={i} href={s.href} target="_blank" rel="noopener noreferrer">{s.text}</a>)}</>; }
