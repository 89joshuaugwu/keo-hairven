import { NextRequest, NextResponse } from "next/server";
import { ADMIN_CSRF_COOKIE } from "@/lib/admin-auth";
import { getVerifiedAdminSession, type VerifiedAdminSession } from "@/lib/admin-session";
import { adminClientSafe } from "@/lib/admin-serialise";

export function isTrustedAdminOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return origin === request.nextUrl.origin || Boolean(configured && origin === configured);
}

export async function requireAdminApi(request: NextRequest, mutation = false): Promise<{ session: VerifiedAdminSession } | { response: NextResponse }> {
  if (!isTrustedAdminOrigin(request)) {
    return { response: NextResponse.json({ code: "bad-origin", message: "Request could not be verified." }, { status: 403 }) };
  }
  const session = await getVerifiedAdminSession();
  if (!session?.role) {
    return { response: NextResponse.json({ code: "session-expired", message: "Your admin session has expired." }, { status: 401 }) };
  }
  if (mutation) {
    const cookieToken = request.cookies.get(ADMIN_CSRF_COOKIE)?.value || "";
    const headerToken = request.headers.get("x-csrf-token") || "";
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return { response: NextResponse.json({ code: "csrf", message: "Please refresh the page and try again." }, { status: 403 }) };
    }
  }
  return { session };
}

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(adminClientSafe(body), init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function readCsrfCookieFromDocument() {
  return "";
}
