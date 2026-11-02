import {getStarterSuppressions,getCategoryRegistry,writeCategorized,writeImported,validateMediaAssignment} from "@/lib/categories-server";
import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { signCloudinaryParams } from "@/lib/cloudinary-admin";
import { getStarterMediaLibrary, mediaLibraryFromDoc } from "@/lib/admin-media";
import { mediaFromDoc, publicProductProjection } from "@/lib/admin-products";
import { publicLookProjection } from "@/lib/admin-looks";
import { publicServiceProjection } from "@/lib/admin-services";
import { productDesignPreview, type ProductCategory } from "@/lib/products";
import { publicLooks } from "@/lib/gallery";
import { serviceDesignPreview } from "@/lib/services";
import { publicFaqs } from "@/lib/faqs";
import { defaultAdminContentDraft, defaultPublicSiteContent } from "@/lib/site-content";
import { defaultAdminBusinessSettings, adminBusinessToPublic } from "@/lib/business-settings";
import { mediaToPublicContent } from "@/lib/admin-content";
import type { AdminMediaRecord, AdminProductRecord } from "@/lib/admin-product-shared";
import type { AdminLookRecord } from "@/lib/look-admin-shared";
import type { AdminServiceRecord } from "@/lib/admin-service-shared";
import type { SiteSetupStatus } from "@/lib/site-setup-shared";

function millis(value: unknown) {
  return (value as { toMillis?: () => number } | undefined)?.toMillis?.() || undefined;
}

export async function getSiteSetupStatus(): Promise<SiteSetupStatus> {
  const db = getAdminDb();
  if (!db) return { state: "failed", products: 0, looks: 0, services: 0, faqs: 0, media: 0, cloudinaryCopied: 0, cloudinaryFallbacks: 0, message: "Admin database is not configured." };
  try {
    const snap = await db.collection("siteSetup").doc("current").get();
    if (!snap.exists) return { state: "not-started", products: 0, looks: 0, services: 0, faqs: 0, media: 0, cloudinaryCopied: 0, cloudinaryFallbacks: 0 };
    const raw = snap.data() || {};
    return {
      state: ["running", "ready", "partial", "failed"].includes(String(raw.state)) ? raw.state : "not-started",
      completedAt: millis(raw.completedAt),
      completedBy: typeof raw.completedBy === "string" ? raw.completedBy : undefined,
      products: Number.isInteger(raw.products) ? raw.products : 0,
      looks: Number.isInteger(raw.looks) ? raw.looks : 0,
      services: Number.isInteger(raw.services) ? raw.services : 0,
      faqs: Number.isInteger(raw.faqs) ? raw.faqs : 0,
      media: Number.isInteger(raw.media) ? raw.media : 0,
      cloudinaryCopied: Number.isInteger(raw.cloudinaryCopied) ? raw.cloudinaryCopied : 0,
      cloudinaryFallbacks: Number.isInteger(raw.cloudinaryFallbacks) ? raw.cloudinaryFallbacks : 0,
      message: typeof raw.message === "string" ? raw.message : undefined,
    };
  } catch {
    return { state: "failed", products: 0, looks: 0, services: 0, faqs: 0, media: 0, cloudinaryCopied: 0, cloudinaryFallbacks: 0, message: "Starting-content status could not be read." };
  }
}

async function copyBundledToCloudinary(item: ReturnType<typeof getStarterMediaLibrary>[number], origin: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "keo-hairven/site-content";
  const publicId = item.id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 140);
  const params: Record<string, string | number | boolean> = { timestamp, folder, public_id: publicId, overwrite: true };
  const signature = signCloudinaryParams(params, apiSecret);
  const sourceUrl = item.secureUrl.startsWith("http") ? item.secureUrl : `${origin.replace(/\/$/, "")}${item.secureUrl}`;
  const form = new FormData();
  form.append("file", sourceUrl);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("signature", signature);
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${item.resourceType}/upload`, {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok || typeof payload.secure_url !== "string") return null;
    return {
      publicId: typeof payload.public_id === "string" ? payload.public_id : undefined,
      secureUrl: payload.secure_url,
      bytes: Number.isFinite(payload.bytes) ? Number(payload.bytes) : item.bytes,
      width: Number.isFinite(payload.width) ? Number(payload.width) : item.width,
      height: Number.isFinite(payload.height) ? Number(payload.height) : item.height,
      duration: Number.isFinite(payload.duration) ? Number(payload.duration) : item.duration,
      format: typeof payload.format === "string" ? payload.format : item.format,
    };
  } catch {
    return null;
  }
}

function productDescription(title: string) {
  return `${title}. Message KEO Hairven to confirm the colour, finish and current availability.`;
}

function mediaIdsForLook(lookId: string) {
  if (lookId === "campaign-braids-01") return ["starter-braids-inspiration", "starter-video-braids"];
  if (lookId === "campaign-waves-01") return ["starter-waves-campaign"];
  if (lookId === "campaign-nails-01") return ["starter-nails-inspiration"];
  return [];
}

function mediaIdForService(serviceId: string) {
  return serviceId === "svc-hair" ? "starter-braids-inspiration" : "starter-nails-inspiration";
}

async function existingBySlug(collection: string, slug: string) {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(collection).where("slug", "==", slug).limit(1).get().catch(() => null);
  return snap && !snap.empty ? snap.docs[0] : null;
}

export async function importCurrentSiteAsManagedData(actor: string | undefined, origin: string): Promise<SiteSetupStatus> {
  const db = getAdminDb();
  if (!db) return { state: "failed", products: 0, looks: 0, services: 0, faqs: 0, media: 0, cloudinaryCopied: 0, cloudinaryFallbacks: 0, message: "Admin database is not configured." };
  const deletedMedia=await getStarterSuppressions("media");
  const deletedFaqsEarly=await getStarterSuppressions("faqs");
  const statusRef = db.collection("siteSetup").doc("current");
  const existingStatus = await statusRef.get().catch(() => null);
  if (existingStatus?.exists && existingStatus.data()?.state === "ready") return getSiteSetupStatus();

  const baseStatus = { products: 0, looks: 0, services: 0, faqs: 0, media: 0, cloudinaryCopied: 0, cloudinaryFallbacks: 0 };
  await statusRef.set({ state: "running", startedAt: FieldValue.serverTimestamp(), completedBy: actor || "owner", ...baseStatus }, { merge: true });

  try {
    const starters = getStarterMediaLibrary();
    const mediaDocs = new Map<string, AdminMediaRecord>();
    let copied = 0;
    let fallbackCount = 0;

    for (let index = 0; index < starters.length; index += 4) {
      const slice = starters.slice(index, index + 4);
      await Promise.all(slice.map(async (item) => {
        if(deletedMedia.has(item.id))return;
        const ref = db.collection("media").doc(item.id);
        const existing = await ref.get();
        if (existing.exists) {
          mediaDocs.set(item.id, mediaFromDoc(item.id, existing.data() || {}));
          return;
        }
        const uploaded = await copyBundledToCloudinary(item, origin);
        if (uploaded) copied += 1; else fallbackCount += 1;
        const stored = {
          publicId: uploaded?.publicId || null,
          secureUrl: uploaded?.secureUrl || item.secureUrl,
          resourceType: item.resourceType,
          format: uploaded?.format || item.format || (item.resourceType === "video" ? "mp4" : "webp"),
          ...(Number.isFinite(uploaded?.bytes ?? item.bytes) ? { bytes: uploaded?.bytes ?? item.bytes } : {}),
          ...(Number.isFinite(uploaded?.width ?? item.width) ? { width: uploaded?.width ?? item.width } : {}),
          ...(Number.isFinite(uploaded?.height ?? item.height) ? { height: uploaded?.height ?? item.height } : {}),
          ...(item.resourceType === "video" && Number.isFinite(uploaded?.duration ?? item.duration) ? { duration: uploaded?.duration ?? item.duration } : {}),
          alt: item.alt,
          caption: "",
          focal: item.focal || { x: .5, y: .5 },
          provenance: item.provenance,
          generated: item.generated === true,
          consentConfirmed: item.consentConfirmed === true,
          actualItem: item.id === "starter-hair-collection" ? true : item.actualItem === true,
          originalFilename: item.label,
          status: "active",
          revision: 1,
          uses: [],
          createdBy: actor || "owner",
          importedFromCurrentSite: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if(!await writeImported(ref,stored,"media",0,item.id))return;
        mediaDocs.set(item.id, mediaFromDoc(item.id, stored));
      }));
    }

    const deletedProducts=await getStarterSuppressions("products");
    const deletedLooks=await getStarterSuppressions("looks");
    const deletedServices=await getStarterSuppressions("services");
    const deletedFaqs=await getStarterSuppressions("faqs");
    const productCategories=await getCategoryRegistry("products");
    const galleryCategories=await getCategoryRegistry("gallery");
    let products = 0;
    for (const source of productDesignPreview) {
      if(deletedProducts.has(source.id))continue;
      const existing = await existingBySlug("products", source.slug);
      const ref = existing?.ref || db.collection("products").doc(source.id);
      const raw = existing?.data() || {};
      if(raw.status==="trashed"||raw.purgeClaim)continue;
      const revision = Number.isInteger(raw.revision) ? Number(raw.revision) + 1 : 1;
      const record: AdminProductRecord = {
        id: ref.id,
        slug: source.slug,
        title: typeof raw.title === "string" && raw.title.trim() ? raw.title : source.title,
        category: (typeof raw.category === "string" ? raw.category : source.category||"wigs") as ProductCategory,
        description: typeof raw.description === "string" && raw.description.trim() ? raw.description : productDescription(source.title),
        priceMode: source.priceMode,
        priceMinor: Number.isInteger(raw.priceMinor) ? raw.priceMinor : source.priceMinor,
        minPriceMinor: Number.isInteger(raw.minPriceMinor) ? raw.minPriceMinor : source.minPriceMinor,
        maxPriceMinor: Number.isInteger(raw.maxPriceMinor) ? raw.maxPriceMinor : source.maxPriceMinor,
        currency: "NGN",
        availability: (["available", "made-to-order", "confirm", "unavailable"].includes(String(raw.availability)) ? String(raw.availability) : "confirm") as AdminProductRecord["availability"],
        mediaIds: Array.isArray(raw.mediaIds) && raw.mediaIds.length ? raw.mediaIds : ["starter-hair-collection"],
        variants: Array.isArray(raw.variants) ? raw.variants : [],
        status: "published",
        ownerConfirmed: true,
        revision,
      };
      if(!productCategories.entries.some(e=>e.id===record.category))continue;
      const media = record.mediaIds.map((id) => mediaDocs.get(id)).filter((item): item is AdminMediaRecord => Boolean(item));
      if(!await writeImported(ref,{ ...record, importedFromCurrentSite: true, updatedAt: FieldValue.serverTimestamp(), ...(existing?.exists ? {} : { createdAt: FieldValue.serverTimestamp() }) },"products",raw.revision||0,source.id,"publicProducts",{ ...publicProductProjection(record, media), updatedAt: FieldValue.serverTimestamp() }))continue;
      products += 1;
    }

    let looks = 0;
    for (const source of publicLooks) {
      if(deletedLooks.has(source.id)||!galleryCategories.entries.some(e=>e.id===source.category))continue;
      const existing = await existingBySlug("looks", source.slug);
      const ref = existing?.ref || db.collection("looks").doc(source.id);
      const raw = existing?.data() || {};
      if(raw.status==="trashed"||raw.purgeClaim)continue;
      const revision = Number.isInteger(raw.revision) ? Number(raw.revision) + 1 : 1;
      const record: AdminLookRecord = {
        id: ref.id,
        sourceStarterId: source.id,
        suppressStarterPublic: false,
        reference: source.reference,
        slug: source.slug,
        title: typeof raw.title === "string" && raw.title.trim() ? raw.title : source.title,
        category: source.category,
        caption: typeof raw.caption === "string" && raw.caption.trim() ? raw.caption : source.description,
        mediaIds: Array.isArray(raw.mediaIds) && raw.mediaIds.length ? raw.mediaIds : mediaIdsForLook(source.id),
        provenance: source.provenance,
        generated: source.generated,
        clientPermission: raw.clientPermission === true,
        priceMode: source.priceMode,
        priceMinor: Number.isInteger(raw.priceMinor) ? raw.priceMinor : source.priceMinor,
        status: "published",
        revision,
      };
      const media = record.mediaIds.map((id) => mediaDocs.get(id)).filter((item): item is AdminMediaRecord => Boolean(item));
      if(!await writeImported(ref,{ ...record, importedFromCurrentSite: true, deletedAt: null, updatedAt: FieldValue.serverTimestamp(), ...(existing?.exists ? {} : { createdAt: FieldValue.serverTimestamp() }) },"looks",raw.revision||0,source.id,"publicLooks",{ ...publicLookProjection(record, media), updatedAt: FieldValue.serverTimestamp() }))continue;
      looks += 1;
    }

    let services = 0;
    for (const source of serviceDesignPreview) {
      if(deletedServices.has(source.id))continue;
      const existing = await existingBySlug("services", source.slug);
      const ref = existing?.ref || db.collection("services").doc(source.id);
      const raw = existing?.data() || {};
      if(raw.status==="trashed"||raw.purgeClaim)continue;
      const revision = Number.isInteger(raw.revision) ? Number(raw.revision) + 1 : 1;
      const record: AdminServiceRecord = {
        id: ref.id,
        sourceStarterId: source.id,
        suppressStarterPublic: false,
        slug: source.slug,
        title: typeof raw.title === "string" && raw.title.trim() ? raw.title : source.title || source.categoryLabel,
        description: typeof raw.description === "string" && raw.description.trim() ? raw.description : source.detailDescription,
        mediaIds: Array.isArray(raw.mediaIds) && raw.mediaIds.length ? raw.mediaIds : [mediaIdForService(source.id)],
        priceMode: source.priceMode,
        priceMinor: Number.isInteger(raw.priceMinor) ? raw.priceMinor : source.priceMinor,
        minPriceMinor: Number.isInteger(raw.minPriceMinor) ? raw.minPriceMinor : source.minPriceMinor,
        maxPriceMinor: Number.isInteger(raw.maxPriceMinor) ? raw.maxPriceMinor : source.maxPriceMinor,
        preparation: typeof raw.preparation === "string" && raw.preparation.trim() ? raw.preparation : source.preparation || "",
        status: "published",
        revision,
      };
      const media = record.mediaIds.map((id) => mediaDocs.get(id)).filter((item): item is AdminMediaRecord => Boolean(item));
      if(!await writeImported(ref,{ ...record, importedFromCurrentSite: true, deletedAt: null, updatedAt: FieldValue.serverTimestamp(), ...(existing?.exists ? {} : { createdAt: FieldValue.serverTimestamp() }) },"services",raw.revision||0,source.id,"publicServices",{ ...publicServiceProjection(record, media), updatedAt: FieldValue.serverTimestamp() }))continue;
      services += 1;
    }

    const draftRef = db.collection("settingsDrafts").doc("site");
    const publicRef = db.collection("publicSettings").doc("site");
    const [draftSnap, publicSnap] = await Promise.all([draftRef.get(), publicRef.get()]);
    const draftRaw = draftSnap.data() || {};
    const publicRaw = publicSnap.data() || {};
    const revision = Number.isInteger(draftRaw.revision) ? Number(draftRaw.revision) + 1 : 1;
    const homeMedia = mediaDocs.get(defaultAdminContentDraft.homeHeroMediaId);
    const aboutMedia = mediaDocs.get(defaultAdminContentDraft.aboutMediaId);
    const currentPublicContent = publicRaw.content && typeof publicRaw.content === "object" ? publicRaw.content as Record<string, unknown> : {};
    const publicContent = {
      ...defaultPublicSiteContent,
      ...currentPublicContent,
      published: true,
      revision,
      homeHeroMedia: currentPublicContent.homeHeroMedia || mediaToPublicContent(homeMedia ? mediaLibraryFromDoc(homeMedia.id, homeMedia as unknown as Record<string, any>) : undefined, defaultPublicSiteContent.homeHeroMedia),
      aboutMedia: currentPublicContent.aboutMedia || mediaToPublicContent(aboutMedia ? mediaLibraryFromDoc(aboutMedia.id, aboutMedia as unknown as Record<string, any>) : undefined, defaultPublicSiteContent.aboutMedia),
      updatedAt: FieldValue.serverTimestamp(),
    };
    const publicBusiness = publicRaw.business && typeof publicRaw.business === "object"
      ? publicRaw.business
      : { ...adminBusinessToPublic(defaultAdminBusinessSettings, revision), updatedAt: FieldValue.serverTimestamp() };
    const privateBusiness = draftRaw.business && typeof draftRaw.business === "object"
      ? draftRaw.business
      : (() => { const { revision: _revision, ...rest } = defaultAdminBusinessSettings; return rest; })();
    await db.runTransaction(async tx=>{await validateMediaAssignment(tx,[homeMedia?.id,aboutMedia?.id].filter((v):v is string=>Boolean(v)),true);
      tx.set(draftRef,{ ...defaultAdminContentDraft, ...draftRaw, business: privateBusiness, revision, importedFromCurrentSite: true, updatedAt: FieldValue.serverTimestamp(), ...(draftSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }) }, { merge: true });
      tx.set(publicRef,{ content: publicContent, business: publicBusiness }, { merge: true });
    });

    let faqs = 0;
    for (let index = 0; index < publicFaqs.length; index += 1) {
      const source = publicFaqs[index];
      if(deletedFaqsEarly.has(source.id))continue;
      const privateRef = db.collection("faqs").doc(source.id);
      const existing = await privateRef.get();
      if(existing.data()?.status==="trashed"||existing.data()?.purgeClaim)continue;
      const raw = existing.data() || {};
      const nextRevision = Number.isInteger(raw.revision) ? Number(raw.revision) + 1 : 1;
      const category = typeof raw.group === "string" ? raw.group : source.category;
      const question = typeof raw.question === "string" && raw.question.trim() ? raw.question : source.question;
      const answer = typeof raw.answer === "string" && raw.answer.trim() ? raw.answer : source.answer;
      if(!await writeImported(privateRef,{ sourceStarterId: source.id, question, answer, group: category, sortOrder: index + 1, status: "published", revision: nextRevision, importedFromCurrentSite: true, deletedAt: null, updatedAt: FieldValue.serverTimestamp(), ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }) },"faqs",raw.revision||0,source.id,"publicFaqs",{ question, answer, group: category, sortOrder: index + 1, updatedAt: FieldValue.serverTimestamp() }))continue;
      faqs += 1;
    }

    const result: SiteSetupStatus = {
      state: "ready",
      completedAt: Date.now(),
      completedBy: actor,
      products,
      looks,
      services,
      faqs,
      media: starters.length,
      cloudinaryCopied: copied,
      cloudinaryFallbacks: fallbackCount,
      message: fallbackCount > 0
        ? "Your current website content is now editable in Admin. Some media is still served from the website files and can be replaced normally from Media Library whenever you want."
        : "Your current website content is now your editable Admin data.",
    };
    await statusRef.set({ ...result, completedAt: FieldValue.serverTimestamp(), completedBy: actor || "owner" });
    await db.collection("adminAudit").add({ actor: actor || "owner", action: "site.import-current-content", entityId: "site", success: true, createdAt: FieldValue.serverTimestamp() }).catch(() => undefined);

    for (const path of ["/", "/products", "/gallery", "/services", "/about", "/faq", "/contact", "/admin", "/admin/products", "/admin/gallery", "/admin/services", "/admin/media", "/admin/content", "/admin/settings"]) {
      revalidatePath(path);
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/\s+/g, " ").slice(0, 220) : "Unknown setup error";
    const failed: SiteSetupStatus = { state: "failed", ...baseStatus, completedAt: Date.now(), completedBy: actor, message: `Current site content could not be imported: ${message}` };
    await statusRef.set({ ...failed, completedAt: FieldValue.serverTimestamp(), completedBy: actor || "owner" }, { merge: true }).catch(() => undefined);
    await db.collection("adminAudit").add({ actor: actor || "owner", action: "site.import-current-content", entityId: "site", success: false, createdAt: FieldValue.serverTimestamp() }).catch(() => undefined);
    return failed;
  }
}
