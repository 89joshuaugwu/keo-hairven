import { validateMediaAssignment } from "@/lib/categories-server";
import { Timestamp } from "firebase-admin/firestore";
import { expiryFor } from "@/lib/trash-shared";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminContentBundle, faqDraftPayload, logContentAdminAction } from "@/lib/admin-content";
import { getAdminDb } from "@/lib/firebase-admin";
import { sanitiseContentDraft, type AdminContentDraft, type AdminFaqRecord } from "@/lib/site-content";

export const runtime = "nodejs";

type RemovedFaq = { id: string; revision?: number; sourceStarterId?: string };

type SaveBody = {
  content?: Partial<AdminContentDraft>;
  expectedRevision?: number;
  faqs?: Partial<AdminFaqRecord>[];
  removedFaqs?: RemovedFaq[];
};

function validFaqId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(value);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if ("response" in auth) return auth.response;
  const bundle = await getAdminContentBundle();
  return noStoreJson(bundle);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });

  let body: SaveBody = {};
  try { body = await request.json(); } catch { /* validation below */ }
  const expectedRevision = Number.isInteger(body.expectedRevision) ? Number(body.expectedRevision) : 0;
  const faqs = Array.isArray(body.faqs) ? body.faqs.slice(0, 40) : [];
  const removedFaqs = Array.isArray(body.removedFaqs) ? body.removedFaqs.filter((item) => validFaqId(item?.id)).slice(0, 40) : [];
  const incoming = sanitiseContentDraft(body.content || {});

  for (const faq of faqs) {
    if (!validFaqId(faq.id)) return noStoreJson({ code: "validation", message: "One FAQ has an invalid identifier." }, { status: 400 });
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      await validateMediaAssignment(transaction,[incoming.homeHeroMediaId,incoming.aboutMediaId].filter(Boolean),true);
      const contentRef = db.collection("settingsDrafts").doc("site");
      const contentSnap = await transaction.get(contentRef);
      const currentRevision = contentSnap.exists && Number.isInteger(contentSnap.data()?.revision) ? Number(contentSnap.data()?.revision) : 0;
      if (currentRevision !== expectedRevision) {
        const error = new Error("revision-conflict");
        (error as Error & { currentRevision?: number }).currentRevision = currentRevision;
        throw error;
      }

      const faqRefs = new Map<string, FirebaseFirestore.DocumentReference>();
      [...faqs.map((faq) => String(faq.id)), ...removedFaqs.map((faq) => faq.id)].forEach((id) => faqRefs.set(id, db.collection("faqs").doc(id)));
      const faqSnaps = new Map<string, FirebaseFirestore.DocumentSnapshot>();
      for (const [id, ref] of faqRefs) faqSnaps.set(id, await transaction.get(ref));

      for (const faq of faqs) {
        const id = String(faq.id);
        const snap = faqSnaps.get(id);
        const current = snap?.exists && Number.isInteger(snap.data()?.revision) ? Number(snap.data()?.revision) : 0;
        const expected = Number.isInteger(faq.revision) ? Number(faq.revision) : 0;
        if (current !== expected) {
          const error = new Error(`faq-conflict:${id}`);
          (error as Error & { faqId?: string; currentRevision?: number }).faqId = id;
          (error as Error & { currentRevision?: number }).currentRevision = current;
          throw error;
        }
      }

      for(const snap of faqSnaps.values()){if(snap.data()?.purgeClaim)throw Error("A question is being deleted. Refresh before saving.");}
      const suppressed = new Set(incoming.suppressedFaqIds);
      for (const removed of removedFaqs) {
        const snap = faqSnaps.get(removed.id);
        if (snap?.exists) {
          const raw = snap.data() || {};
          const current = Number.isInteger(raw.revision) ? Number(raw.revision) : 1;
          if (Number.isInteger(removed.revision) && Number(removed.revision) !== current) {
            const error = new Error(`faq-conflict:${removed.id}`);
            (error as Error & { faqId?: string; currentRevision?: number }).faqId = removed.id;
            (error as Error & { currentRevision?: number }).currentRevision = current;
            throw error;
          }
          const sourceStarterId = typeof raw.sourceStarterId === "string" ? raw.sourceStarterId : removed.sourceStarterId;
          if (sourceStarterId) suppressed.add(sourceStarterId);
        } else if (removed.sourceStarterId || removed.id.startsWith("faq-")) {
          suppressed.add(removed.sourceStarterId || removed.id);
        }
      }

      const nextContentRevision = currentRevision + 1;
      transaction.set(contentRef, {
        ...incoming,
        suppressedFaqIds: [...suppressed],
        revision: nextContentRevision,
        updatedAt: FieldValue.serverTimestamp(),
        ...(contentSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      }, { merge: true });

      const faqRevisions: Record<string, number> = {};
      faqs.forEach((faq, index) => {
        const id = String(faq.id);
        const snap = faqSnaps.get(id);
        const current = snap?.exists && Number.isInteger(snap.data()?.revision) ? Number(snap.data()?.revision) : 0;
        const next = current + 1;
        const payload = faqDraftPayload(faq as Partial<AdminFaqRecord>, index + 1);
        transaction.set(db.collection("faqs").doc(id), {
          ...payload,
          status: "draft",
          revision: next,
          deletedAt: null,
          purgeAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
          ...(snap?.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        }, { merge: true });
        faqRevisions[id] = next;
      });

      removedFaqs.forEach((removed) => {
        const snap = faqSnaps.get(removed.id);
        if (!snap?.exists) return;
        const current = Number.isInteger(snap.data()?.revision) ? Number(snap.data()?.revision) : 1;
        transaction.set(db.collection("faqs").doc(removed.id), {
          status: "trashed",
          purgeAt: snap.data()?.purgeAt || Timestamp.fromMillis(expiryFor(Date.now())),
          revision: current + 1,
          deletedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      });

      return { revision: nextContentRevision, faqRevisions, suppressedFaqIds: [...suppressed] };
    });

    await logContentAdminAction(auth.session.email, "content.save-draft");
    return noStoreJson({ ok: true, ...result });
  } catch (error) {
    const value = error as Error & { faqId?: string; currentRevision?: number };
    if (value.message === "revision-conflict") {
      return noStoreJson({ code: "conflict", message: "This website draft changed in another tab. Refresh before saving again.", currentRevision: value.currentRevision }, { status: 409 });
    }
    if (value.message.startsWith("faq-conflict:")) {
      return noStoreJson({ code: "conflict", message: "One FAQ changed in another tab. Refresh before saving again.", faqId: value.faqId, currentRevision: value.currentRevision }, { status: 409 });
    }
    return noStoreJson({ code: "save-failed", message: "The website draft could not be saved. Please try again." }, { status: 500 });
  }
}
