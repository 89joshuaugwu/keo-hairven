"use client";

import { ModalDialog } from "@/components/ModalDialog";
import { FormEvent, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseClientAuth } from "@/lib/firebase-client";

type LoginMode = "idle" | "email" | "google";

const genericLoginError = "Unable to sign in. Check your details and try again.";

async function createServerSession(user: User) {
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ idToken }),
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
  if (!response.ok) {
    const error = new Error(payload.message || genericLoginError) as Error & { code?: string };
    error.code = payload.code;
    throw error;
  }
}

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>("idle");
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const auth = getFirebaseClientAuth();
    if (!auth) return;
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user) return;
        setMode("google");
        try {
          await createServerSession(result.user);
          window.location.assign("/admin");
        } catch (caught) {
          await signOut(auth).catch(() => undefined);
          setError(caught instanceof Error ? caught.message : genericLoginError);
          setMode("idle");
        }
      })
      .catch(() => {
        setError(genericLoginError);
        setMode("idle");
      });
  }, []);

  const signInEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode !== "idle") return;
    const auth = getFirebaseClientAuth();
    if (!auth) {
      setError("Firebase authentication is not configured for this site.");
      return;
    }
    setError("");
    setMode("email");
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await createServerSession(credential.user);
      window.location.assign("/admin");
    } catch (caught) {
      await signOut(auth).catch(() => undefined);
      const message = caught instanceof Error && caught.message.includes("admin access")
        ? "This account does not have admin access."
        : genericLoginError;
      setError(message);
      setMode("idle");
    }
  };

  const signInGoogle = async () => {
    if (mode !== "idle") return;
    const auth = getFirebaseClientAuth();
    if (!auth) {
      setError("Firebase authentication is not configured for this site.");
      return;
    }
    setError("");
    setMode("google");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const result = await signInWithPopup(auth, provider);
      await createServerSession(result.user);
      window.location.assign("/admin");
    } catch (caught) {
      const code = typeof caught === "object" && caught && "code" in caught ? String((caught as { code?: string }).code) : "";
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch {
          // Fall through to generic error.
        }
      }
      await signOut(auth).catch(() => undefined);
      setError(code === "access-denied" ? "This account does not have admin access." : genericLoginError);
      setMode("idle");
    }
  };

  const openReset = () => {
    setResetEmail(email.trim());
    setResetSent(false);
    setResetOpen(true);
  };

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resetBusy) return;
    const auth = getFirebaseClientAuth();
    if (!auth) { setError("Firebase authentication is not configured for this site."); setResetOpen(false); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) { setError("Enter a valid email address for password reset."); setResetOpen(false); return; }
    setResetBusy(true);
    try {
      if (auth && resetEmail.trim()) {
        await sendPasswordResetEmail(auth, resetEmail.trim()).catch(() => undefined);
      }
      setResetSent(true);
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <>
      <form className="admin-login-form" onSubmit={signInEmail} noValidate>
        <label className="admin-login-field">
          <span>Email address</span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            disabled={mode !== "idle"}
          />
        </label>

        <label className="admin-login-field">
          <span>Password</span>
          <div className="admin-password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              disabled={mode !== "idle"}
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {error && <div className="admin-login-error" role="alert">{error}</div>}

        <button className="button button-primary admin-login-submit" type="submit" disabled={mode !== "idle" || !email.trim() || !password}>
          {mode === "email" ? "Signing in…" : <>Sign in <span aria-hidden="true">→</span></>}
        </button>

        <div className="admin-login-divider"><span>or</span></div>

        <button className="button admin-google-button" type="button" onClick={signInGoogle} disabled={mode !== "idle"}>
          <span className="admin-google-mark" aria-hidden="true">G</span>
          {mode === "google" ? "Connecting…" : "Continue with Google"}
        </button>

        <button className="admin-forgot-link" type="button" onClick={openReset}>Forgot your password?</button>
      </form>

      <ModalDialog open={resetOpen} onClose={() => { if (!resetBusy) setResetOpen(false); }} label="Reset your password" className="studio-reset-dialog">
          <section className="admin-reset-modal">
            <button className="admin-reset-close" type="button" onClick={() => setResetOpen(false)} aria-label="Close password reset">×</button>
            <div className="eyebrow">PASSWORD RESET</div>
            <h2 id="admin-reset-title">Reset your password.</h2>
            {resetSent ? (
              <>
                <p>If that address belongs to an authorised admin, Firebase will send password reset instructions.</p>
                <button className="button button-primary" type="button" onClick={() => setResetOpen(false)}>Done</button>
              </>
            ) : (
              <form onSubmit={submitReset} noValidate>
                <p>Enter the email address you use for KEO Hairven admin access.</p>
                <label className="admin-login-field">
                  <span>Email address</span>
                  <input type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} autoComplete="email" required />
                </label>
                <button className="button button-primary" type="submit" disabled={resetBusy || !resetEmail.trim()}>
                  {resetBusy ? "Sending…" : "Send reset link"}
                </button>
              </form>
            )}
          </section>
      </ModalDialog>
    </>
  );
}
