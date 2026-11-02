import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_MS,
  resolveAdminAccess,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

function trustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return origin === request.nextUrl.origin || Boolean(configured && origin === configured);
}

export async function POST(request: NextRequest) {
  if (!trustedOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Unable to sign in." }, { status: 403 });
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, message: "Admin authentication is not configured." }, { status: 503 });
  }

  let idToken = "";
  try {
    const body = (await request.json()) as { idToken?: string };
    idToken = typeof body.idToken === "string" ? body.idToken : "";
  } catch {
    // Generic invalid request below.
  }
  if (!idToken) {
    return NextResponse.json({ ok: false, message: "Unable to sign in." }, { status: 400 });
  }

  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    const access = resolveAdminAccess(decoded);
    if (!access.authorised || !access.role) {
      return NextResponse.json(
        { ok: false, code: "access-denied", message: "This account does not have admin access." },
        { status: 403 }
      );
    }

    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: ADMIN_SESSION_MAX_AGE_MS });
    const response = NextResponse.json({ ok: true, role: access.role });
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(ADMIN_SESSION_MAX_AGE_MS / 1000),
    });
    response.cookies.set(ADMIN_CSRF_COOKIE, randomBytes(24).toString("base64url"), {
      httpOnly: false,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge: Math.floor(ADMIN_SESSION_MAX_AGE_MS / 1000),
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to sign in. Check your details and try again." }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!trustedOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  response.cookies.set(ADMIN_CSRF_COOKIE, "", { expires: new Date(0), path: "/" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
