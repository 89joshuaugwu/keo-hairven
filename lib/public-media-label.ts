export function publicMediaLabel(caption?: string) {
  const value = (caption || "").trim();
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower.includes("ai-generated") || lower.includes("ai generated") || lower.includes("illustrative") || lower.includes("not actual") || lower.includes("not stock") || lower.includes("preview image")) return "";
  if (lower.includes("campaign inspiration") || lower.includes("style inspiration")) return "";
  if (lower.includes("customer bag") || lower.includes("brand-story")) return "KEO Hairven";
  return value.length > 34 ? `${value.slice(0, 31).trim()}…` : value;
}
