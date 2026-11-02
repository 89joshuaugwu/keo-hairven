import "server-only";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin";
import { ADMIN_SESSION_COOKIE, resolveAdminAccess, type AdminAccess } from "@/lib/admin-auth";

export type VerifiedAdminSession = AdminAccess & {
  uid: string;
};

export async function getVerifiedAdminSession(): Promise<VerifiedAdminSession | null> {
  const auth = getAdminAuth();
  if (!auth) return null;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    const access = resolveAdminAccess(decoded);
    if (!access.authorised) return null;
    return { ...access, uid: decoded.uid };
  } catch {
    return null;
  }
}
