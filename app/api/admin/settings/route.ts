import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { getAdminBusinessSettings, logBusinessAdminAction } from "@/lib/admin-business";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { adminBusinessToPublic, sanitiseBusinessSettings, validateBusinessSettings, type AdminBusinessSettings } from "@/lib/business-settings";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type SaveBody = {
  settings?: Partial<AdminBusinessSettings>;
  expectedRevision?: number;
};

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if ("response" in auth) return auth.response;
  return noStoreJson({ settings: await getAdminBusinessSettings(), canEdit: auth.session.role === "owner" });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "owner") {
    return noStoreJson({ code: "forbidden", message: "Only the owner can change business-wide contact details." }, { status: 403 });
  }

  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });

  let body: SaveBody = {};
  try { body = await request.json(); } catch { /* validation below */ }
  const expectedRevision = Number.isInteger(body.expectedRevision) ? Number(body.expectedRevision) : -1;
  const incoming = sanitiseBusinessSettings({ ...(body.settings || {}), revision: expectedRevision });
  const fieldErrors = validateBusinessSettings(incoming);
  if (Object.keys(fieldErrors).length) {
    return noStoreJson({ code: "validation", message: "Review the highlighted business details.", fieldErrors }, { status: 400 });
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const draftRef = db.collection("settingsDrafts").doc("site");
      const publicRef = db.collection("publicSettings").doc("site");
      const draftSnap = await transaction.get(draftRef);
      const currentRevision = draftSnap.exists && Number.isInteger(draftSnap.data()?.revision) ? Number(draftSnap.data()?.revision) : 0;
      if (currentRevision !== expectedRevision) {
        const error = new Error("revision-conflict");
        (error as Error & { currentRevision?: number }).currentRevision = currentRevision;
        throw error;
      }

      const nextRevision = currentRevision + 1;
      const { revision: _revision, ...privateBusiness } = incoming;
      const publicBusiness = adminBusinessToPublic(incoming, nextRevision);

      transaction.set(draftRef, {
        business: privateBusiness,
        revision: nextRevision,
        updatedAt: FieldValue.serverTimestamp(),
        ...(draftSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      }, { merge: true });
      transaction.set(publicRef, {
        business: {
          ...publicBusiness,
          updatedAt: FieldValue.serverTimestamp(),
        },
      }, { merge: true });
      return { nextRevision, publicBusiness };
    });

    await logBusinessAdminAction(auth.session.email, "settings.business.update");
    revalidatePath("/", "layout");
    revalidatePath("/contact");
    revalidatePath("/about");
    revalidatePath("/products");
    revalidatePath("/services");
    revalidatePath("/privacy");

    return noStoreJson({
      ok: true,
      revision: result.nextRevision,
      settings: { ...incoming, revision: result.nextRevision },
      public: result.publicBusiness,
      message: "Business details saved and published.",
    });
  } catch (error) {
    const value = error as Error & { currentRevision?: number };
    if (value.message === "revision-conflict") {
      return noStoreJson({ code: "conflict", message: "These business details changed in another tab. Refresh before saving again.", currentRevision: value.currentRevision }, { status: 409 });
    }
    await logBusinessAdminAction(auth.session.email, "settings.business.update", false);
    return noStoreJson({ code: "save-failed", message: "The business details could not be saved. Please try again." }, { status: 500 });
  }
}
