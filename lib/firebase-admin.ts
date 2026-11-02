import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

type ServiceAccountShape = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

let cachedDb: Firestore | null | undefined;
let cachedAuth: Auth | null | undefined;

function readLocalServiceAccount(): ServiceAccountShape | null {
  try {
    const file = path.join(process.cwd(), "keo-hairven-firebase-adminsdk.json");
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as ServiceAccountShape;
  } catch {
    return null;
  }
}

function ensureAdminApp() {
  if (getApps().length) return getApps()[0];

  const local = readLocalServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID || local?.project_id;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || local?.client_email;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || local?.private_key)?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getAdminAuth(): Auth | null {
  if (cachedAuth !== undefined) return cachedAuth;
  try {
    const adminApp = ensureAdminApp();
    cachedAuth = adminApp ? getAuth(adminApp) : null;
    return cachedAuth;
  } catch {
    cachedAuth = null;
    return cachedAuth;
  }
}

export function getAdminDb(): Firestore | null {
  if (cachedDb !== undefined) return cachedDb;
  try {
    const adminApp = ensureAdminApp();
    cachedDb = adminApp ? getFirestore(adminApp) : null;
    return cachedDb;
  } catch {
    cachedDb = null;
    return cachedDb;
  }
}
