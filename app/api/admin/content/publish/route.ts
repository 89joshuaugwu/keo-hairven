import { validateMediaAssignment } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminContentBundle, faqDraftPayload, logContentAdminAction, mediaToPublicContent } from "@/lib/admin-content";
import { getAdminDb } from "@/lib/firebase-admin";
import { contentPublishErrors, defaultPublicSiteContent, sanitiseContentDraft } from "@/lib/site-content";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, true);
  if ("response" in auth) return auth.response;
  const db = getAdminDb();
  if (!db) return noStoreJson({ code: "database-unavailable", message: "Admin database is not configured." }, { status: 503 });

  let body: { expectedRevision?: number } = {};
  try { body = await request.json(); } catch { /* validation below */ }
  const expectedRevision = Number.isInteger(body.expectedRevision) ? Number(body.expectedRevision) : -1;
  const bundle = await getAdminContentBundle();
  const { revision: currentRevision, ...contentInput } = bundle.content;
  if (expectedRevision !== currentRevision) {
    return noStoreJson({ code: "conflict", message: "The website draft changed before publishing. Refresh and review the latest version." }, { status: 409 });
  }

  const content = sanitiseContentDraft(contentInput);
  const errors = contentPublishErrors(content, bundle.faqs);
  if (Object.keys(errors).length) {
    return noStoreJson({ code: "validation", message: "Review the highlighted website content before publishing.", fieldErrors: errors }, { status: 400 });
  }

  const mediaById = new Map(bundle.media.map((item) => [item.id, item]));
  const homeHeroMedia = mediaToPublicContent(mediaById.get(content.homeHeroMediaId), defaultPublicSiteContent.homeHeroMedia);
  const aboutMedia = mediaToPublicContent(mediaById.get(content.aboutMediaId), defaultPublicSiteContent.aboutMedia);
  const nextRevision = currentRevision + 1;

  try {
    const existingPublicFaqs = await db.collection("publicFaqs").limit(200).get();
    const faqRevisions: Record<string,number>={};
    await db.runTransaction(async transaction=>{
      await validateMediaAssignment(transaction,[content.homeHeroMediaId,content.aboutMediaId].filter(Boolean),true);
      const latest=await transaction.get(db.collection("settingsDrafts").doc("site"));
      if(latest.data()?.revision!==expectedRevision)throw Error("Website draft changed.");
      for(const faq of bundle.faqs){if(!faq.preview&&faq.status!=="trashed"){const snap=await transaction.get(db.collection("faqs").doc(faq.id));if(!snap.exists||snap.data()?.revision!==faq.revision||snap.data()?.status==="trashed")throw Error("Question changed. Refresh before publishing.");}}

    existingPublicFaqs.docs.forEach((doc) => transaction.delete(doc.ref));


    bundle.faqs
      .filter((faq) => faq.status !== "trashed")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((faq, index) => {
        const payload = faqDraftPayload(faq, index + 1);
        transaction.set(db.collection("publicFaqs").doc(faq.id), {
          question: payload.question,
          answer: payload.answer,
          group: payload.group,
          sortOrder: payload.sortOrder,
          updatedAt: FieldValue.serverTimestamp(),
        });
        const nextFaqRevision = Math.max(1, faq.revision + 1);
        faqRevisions[faq.id] = nextFaqRevision;
        transaction.set(db.collection("faqs").doc(faq.id), {
          ...payload,
          status: "published",
          revision: nextFaqRevision,
          deletedAt: null,
          purgeAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
          ...(faq.revision === 0 ? { createdAt: FieldValue.serverTimestamp() } : {}),
        }, { merge: true });
      });

    const publicContent = {
      published: true,
      revision: nextRevision,
      homeHeading: content.homeHeading,
      homeSupportingText: content.homeSupportingText,
      rotatingPhrases: content.rotatingPhrases,
      showBeautyEdit: content.showBeautyEdit,
      showNailEditorial: content.showNailEditorial,
      showCollection: content.showCollection,
      showHowItWorks: content.showHowItWorks,
      homeHeroMedia,
      aboutHeadingLead: content.aboutHeadingLead,
      aboutHeadingEmphasis: content.aboutHeadingEmphasis,
      aboutIntro: content.aboutIntro,
      aboutSectionLead: content.aboutSectionLead,
      aboutSectionEmphasis: content.aboutSectionEmphasis,
      aboutBody1: content.aboutBody1,
      aboutBody2: content.aboutBody2,
      aboutMedia,
      ctaEyebrow: content.ctaEyebrow,
      ctaHeadingLead: content.ctaHeadingLead,
      ctaHeadingEmphasis: content.ctaHeadingEmphasis,
      ctaBody: content.ctaBody,
      ctaButtonLabel: content.ctaButtonLabel,
      updatedAt: FieldValue.serverTimestamp(),
    };

    transaction.set(db.collection("publicSettings").doc("site"), { content: publicContent }, { merge: true });
    transaction.set(db.collection("settingsDrafts").doc("site"), {
      revision: nextRevision,
      lastPublishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    });

    await logContentAdminAction(auth.session.email, "content.publish");
    revalidatePath("/", "layout");
    revalidatePath("/faq");
    revalidatePath("/about");
    return noStoreJson({ ok: true, revision: nextRevision, faqRevisions, message: "Website content published." });
  } catch {
    await logContentAdminAction(auth.session.email, "content.publish", "site", false);
    return noStoreJson({ code: "publish-failed", message: "The website changes could not be published. Please try again." }, { status: 500 });
  }
}
