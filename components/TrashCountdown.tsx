"use client";
import { useEffect, useState } from "react";
import { countdownText } from "@/lib/trash-shared";
export function TrashCountdown({ purgeAt, purgeState }: {
    purgeAt?: number | null;
    purgeState?: string | null;
}) { const [now, setNow] = useState<number>(); useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []); return <div className="trash-countdown"><span>{now ? countdownText(purgeAt || undefined, now) : "Loading countdown"}</span>{purgeAt && <small>Deletion eligible: {now ? new Date(purgeAt).toLocaleString() : "24 hours after removal"}</small>}{purgeState === "blocked" && <small>Still used by another item. Remove its references to allow cleanup.</small>}{purgeState === "failed" && <small>Deletion failed; cleanup will retry.</small>}{purgeState === "claimed" && <small>Cleanup in progress.</small>}</div>; }
