"use client";

export function getAdminCsrfToken() {
  if (typeof document === "undefined") return "";
  const prefix = "zls_admin_csrf=";
  const entry = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : "";
}

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("x-csrf-token", getAdminCsrfToken());
  const response = await fetch(input, { ...init, headers, credentials: "same-origin" });
  if (response.status === 401 && typeof window !== "undefined") window.location.assign("/admin/login?reason=session-expired");
  return response;
}
