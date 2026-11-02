"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MuseTrigger } from "@/components/MuseTrigger";

const moods = [
  { name: "Sleek & polished", word: "Sleek.", eyebrow: "A QUIET KIND OF STATEMENT", copy: "Clean lines. A glossy finish. Explore bone-straight hair for a look that feels beautifully put together.", image: "/assets/campaign/hair-collection.webp", position: "48% 35%", category: "bone-straight", link: "Explore bone straight", prompt: "I love a sleek, polished look. Help me choose bone-straight hair and a length." },
  { name: "Soft & flowing", word: "Fluid.", eyebrow: "A LITTLE MOVEMENT GOES A LONG WAY", copy: "Soft shapes and flowing lengths. Let this wave-inspired mood lead you to your next hair conversation.", image: "/assets/campaign/waves-campaign.webp", position: "50% 28%", category: "hair-extensions", link: "Explore extensions", prompt: "I like soft waves and flowing hair. What should I consider when choosing extensions?" },
  { name: "Bold & braided", word: "Bold.", eyebrow: "EVERY DETAIL, A LITTLE EXPRESSION", copy: "Intricate texture. An unmistakable silhouette. Explore braided wigs and find a style that feels like you.", image: "/assets/campaign/braids-inspiration.webp", position: "50% 28%", category: "braided-wigs", link: "Explore braided wigs", prompt: "I like braided looks. Help me explore what to consider when choosing a braided wig." },
] as const;

export function MoodStudio() {
  const [selected, setSelected] = useState(0);
  const mood = moods[selected];
  return <div className="mood-studio" data-reveal>
    <div className="mood-visual"><div className="mood-image-stack">{moods.map((item, index) => <div key={item.name} className={`mood-image ${index === selected ? "is-active" : ""}`} aria-hidden={index !== selected}><Image src={item.image} alt={`${item.name} — editorial hair inspiration`} fill sizes="(max-width: 700px) 100vw, 55vw" style={{ objectFit: "cover", objectPosition: item.position }} /></div>)}</div><span className="mood-visual-label">THE KEO MOODBOARD</span><span className="mood-word" key={mood.word} aria-hidden="true">{mood.word}</span><span className="mood-visual-note">Editorial inspiration · not confirmed inventory</span></div>
    <div className="mood-content"><div className="eyebrow">WHAT FEELS LIKE YOU?</div><h3>A mood. <br />A texture.<br /><em>Your signature.</em></h3><div className="mood-choices" role="group" aria-label="Choose your hair mood">{moods.map((item, index) => <button type="button" key={item.name} aria-pressed={selected === index} onClick={() => setSelected(index)}><span className="mood-choice-dot" aria-hidden="true" /><span>{item.name}</span><span aria-hidden="true">{selected === index ? "↗" : "+"}</span></button>)}</div><div className="mood-description" aria-live="polite" aria-atomic="true"><span>{mood.eyebrow}</span><p key={mood.name}>{mood.copy}</p></div><Link className="text-link" href={`/products?category=${mood.category}`}>{mood.link}<span aria-hidden="true">↗</span></Link><MuseTrigger className="mood-muse-link" prompt={mood.prompt}>Not sure? Let KEO Muse help <span aria-hidden="true">✦</span></MuseTrigger></div>
  </div>;
}
