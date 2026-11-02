"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ChatProductCardData } from "@/lib/chat-presentation";
export type { ChatProductCardData } from "@/lib/chat-presentation";
export function ChatProductCard({ card, onNavigate }: {
    card: ChatProductCardData;
    onNavigate: () => void;
}) { const [failed, setFailed] = useState(false); return <Link href={card.href} className="ask-zara-product-card" onClick={onNavigate}>{card.image && !failed && <div className="ask-zara-product-image"><Image src={card.image.src} alt={card.image.alt} fill sizes="80px" onError={() => setFailed(true)} style={{ objectFit: "cover" }}/></div>}<div><strong>{card.title}</strong><span>{card.priceLabel}</span><small>View product →</small></div></Link>; }
