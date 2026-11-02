export const TRASH_RETENTION_MS = 24 * 60 * 60 * 1000;
export type TrashKind = "products" | "services" | "looks" | "faqs" | "media";
export function expiryFor(deletedAt: number) { return deletedAt + TRASH_RETENTION_MS; }
export function countdownText(purgeAt: number | undefined, now: number) { if (!purgeAt)
    return "Retention not started"; const seconds = Math.ceil((purgeAt - now) / 1000); if (seconds <= 0)
    return "Awaiting cleanup"; return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s remaining`; }
