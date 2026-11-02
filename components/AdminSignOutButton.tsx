"use client";

import { useState } from "react";
import { getFirebaseClientAuth } from "@/lib/firebase-client";
import { signOut } from "firebase/auth";

export function AdminSignOutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="button button-outline"
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const auth = getFirebaseClientAuth();
          if (auth) await signOut(auth).catch(() => undefined);
          await fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" }).catch(() => undefined);
        } finally {
          window.location.assign("/admin/login");
        }
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
