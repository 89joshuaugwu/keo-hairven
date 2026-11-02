import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";

export const ADMIN_SESSION_COOKIE = "zls_admin_session";
export const ADMIN_CSRF_COOKIE = "zls_admin_csrf";
export const ADMIN_SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export type AdminRole = "owner" | "editor";
export type AdminAccess = {
  authorised: boolean;
  role?: AdminRole;
  email?: string;
  source?: "claims" | "allowlist";
};

function emailSet(name: string) {
  return new Set(
    (process.env[name] || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function resolveAdminAccess(token: DecodedIdToken): AdminAccess {
  const email = token.email?.trim().toLowerCase();
  const claimedRole = token.role === "owner" || token.role === "editor" ? token.role : undefined;

  if (token.admin === true && claimedRole) {
    return { authorised: true, role: claimedRole, email, source: "claims" };
  }

  // An unverified address is not proof of ownership of an allowlisted identity.
  if (email && token.email_verified === true) {
    if (emailSet("ADMIN_OWNER_EMAILS").has(email)) {
      return { authorised: true, role: "owner", email, source: "allowlist" };
    }
    if (emailSet("ADMIN_EDITOR_EMAILS").has(email)) {
      return { authorised: true, role: "editor", email, source: "allowlist" };
    }
  }

  return { authorised: false, email };
}
