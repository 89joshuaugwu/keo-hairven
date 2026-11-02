export type ChatSegment = {
    text: string;
    href?: string;
};
export function parseChatLinks(text: string, allowedUrls: string[]): ChatSegment[] {
    const allowed = new Set(allowedUrls);
    const result: ChatSegment[] = [];
    const regex = /\[([^\]]+)\]\(([^\s)]+)\)|https?:\/\/[^\s<>]+/g;
    let end = 0;
    for (const match of text.matchAll(regex)) {
        const index = match.index!;
        if (index > end)
            result.push({ text: text.slice(end, index) });
        const raw = match[2] || match[0];
        const href = raw.replace(/[.,;!?)\]]+$/g, "");
        let safe = false;
        try {
            const url = new URL(href, "https://local.invalid");
            safe = (url.protocol === "http:" || url.protocol === "https:") && allowed.has(href);
        }
        catch { }
        result.push({ text: match[1] || href, ...(safe ? { href } : {}) });
        if (!match[2] && raw.length > href.length)
            result.push({ text: raw.slice(href.length) });
        end = index + match[0].length;
    }
    if (end < text.length)
        result.push({ text: text.slice(end) });
    return result;
}
