"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

let app: FirebaseApp | null | undefined;
let auth: Auth | null | undefined;

function publicConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function getFirebaseClientApp(): FirebaseApp | null {
  if (app !== undefined) return app;
  const config = publicConfig();
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    app = null;
    return app;
  }
  app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function getFirebaseClientAuth(): Auth | null {
  if (auth !== undefined) return auth;
  const clientApp = getFirebaseClientApp();
  auth = clientApp ? getAuth(clientApp) : null;
  return auth;
}
