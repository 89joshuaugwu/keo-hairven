import {getStarterSuppressions} from "@/lib/categories-server";
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { adminTimeMillis } from "@/lib/admin-serialise";

export type { AdminMediaStatus, AdminMediaProvenance, AdminMediaReference, AdminLibraryMedia } from "@/lib/admin-media-shared";
import type { AdminMediaStatus, AdminMediaProvenance, AdminMediaReference, AdminLibraryMedia } from "@/lib/admin-media-shared";

const starterMedia: AdminLibraryMedia[] = [
  {
    id: "starter-waves-campaign",
    secureUrl: "/assets/campaign/waves-campaign.webp",
    resourceType: "image",
    format: "webp",
    width: 1086,
    height: 1448,
    alt: "Campaign inspiration showing an adult woman with long glossy black waves",
    caption: "",
    focal: { x: .5, y: .35 },
    provenance: "campaign",
    generated: true,
    consentConfirmed: false,
    actualItem: false,
    status: "active",
    revision: 0,
    starter: true,
    label: "Waves campaign",
    references: [
      { type: "starter", id: "home-hero", title: "Home hero", href: "/" },
      { type: "starter", id: "soft-wave-mood", title: "Gallery · Soft-wave mood", href: "/gallery/soft-wave-mood" },
    ],
  },
  {
    id: "starter-braids-inspiration",
    secureUrl: "/assets/campaign/braids-inspiration.webp",
    resourceType: "image",
    format: "webp",
    width: 1086,
    height: 1448,
    alt: "Style inspiration showing an adult woman with long neat black braids",
    caption: "",
    focal: { x: .5, y: .45 },
    provenance: "inspiration",
    generated: true,
    consentConfirmed: false,
    actualItem: false,
    status: "active",
    revision: 0,
    starter: true,
    label: "Braids inspiration",
    references: [
      { type: "starter", id: "beautifully-braided", title: "Gallery · Beautifully braided", href: "/gallery/beautifully-braided" },
      { type: "starter", id: "hair-styling", title: "Services · Braids & styling", href: "/services/hair-styling" },
    ],
  },
  {
    id: "starter-nails-inspiration",
    secureUrl: "/assets/campaign/nails-inspiration.webp",
    resourceType: "image",
    format: "webp",
    width: 1448,
    height: 1086,
    alt: "Nail inspiration showing glossy blush nails with gold details on pink satin",
    caption: "",
    focal: { x: .5, y: .45 },
    provenance: "inspiration",
    generated: true,
    consentConfirmed: false,
    actualItem: false,
    status: "active",
    revision: 0,
    starter: true,
    label: "Nails inspiration",
    references: [
      { type: "starter", id: "blush-and-gold", title: "Gallery · Blush & gold", href: "/gallery/blush-and-gold" },
      { type: "starter", id: "nail-styling", title: "Services · Nail styling", href: "/services/nail-styling" },
    ],
  },
  {
    id: "starter-hair-collection",
    secureUrl: "/assets/campaign/hair-collection.webp",
    resourceType: "image",
    format: "webp",
    width: 1173,
    height: 1341,
    alt: "Hair collection with glossy black wig and attachment pieces",
    caption: "",
    focal: { x: .5, y: .45 },
    provenance: "campaign",
    generated: true,
    consentConfirmed: false,
    actualItem: false,
    status: "active",
    revision: 0,
    starter: true,
    label: "Collection still life",
    references: [
      { type: "starter", id: "home-collection", title: "Home · hair collection", href: "/" },
      { type: "starter", id: "product-preview", title: "Product design previews", href: "/products" },
    ],
  },
  {
    id: "starter-customer-bag",
    secureUrl: "/assets/brand/customer-bag-original.jpg",
    resourceType: "image",
    format: "jpg",
    width: 864,
    height: 1536,
    alt: "Original KEO Hairven branded customer bag",
    caption: "Original KEO Hairven customer bag",
    focal: { x: .5, y: .47 },
    provenance: "business-evidence",
    generated: false,
    consentConfirmed: true,
    actualItem: false,
    status: "active",
    revision: 0,
    starter: true,
    label: "Original customer bag",
    references: [
      { type: "starter", id: "about-story", title: "About · brand story", href: "/about" },
    ],
  },
  {
    id: "starter-video-hero-hair", secureUrl: "/assets/videos/01-hero-hair.mp4", resourceType: "video", format: "mp4", bytes: 2647864, width: 720, height: 1280, duration: 8, alt: "Campaign motion study of glossy black hair", caption: "", focal: { x: .5, y: .3 }, provenance: "campaign", generated: true, consentConfirmed: false, actualItem: false, status: "active", revision: 0, starter: true, label: "Hero hair motion", references: [{ type: "starter", id: "home-hero-video", title: "Home hero motion", href: "/" }],
  },
  {
    id: "starter-video-nails", secureUrl: "/assets/videos/02-nail-details.mp4", resourceType: "video", format: "mp4", bytes: 3878350, width: 1280, height: 720, duration: 8, alt: "Campaign motion study of manicured hands on satin", caption: "", focal: { x: .5, y: .5 }, provenance: "campaign", generated: true, consentConfirmed: false, actualItem: false, status: "active", revision: 0, starter: true, label: "Nail details motion", references: [{ type: "starter", id: "home-nail-video", title: "Home nail editorial", href: "/" }],
  },
  {
    id: "starter-video-collection", secureUrl: "/assets/videos/03-hair-collection.mp4", resourceType: "video", format: "mp4", bytes: 2434006, width: 720, height: 1280, duration: 8, alt: "Campaign motion study of a hair collection still life", caption: "", focal: { x: .5, y: .45 }, provenance: "campaign", generated: true, consentConfirmed: false, actualItem: false, status: "active", revision: 0, starter: true, label: "Hair collection motion", references: [{ type: "starter", id: "home-collection-video", title: "Home hair collection", href: "/" }],
  },
  {
    id: "starter-video-braids", secureUrl: "/assets/videos/04-braid-detail.mp4", resourceType: "video", format: "mp4", bytes: 2583942, width: 720, height: 1280, duration: 8, alt: "Campaign motion study of black braids", caption: "", focal: { x: .5, y: .38 }, provenance: "campaign", generated: true, consentConfirmed: false, actualItem: false, status: "active", revision: 0, starter: true, label: "Braid detail motion", references: [{ type: "starter", id: "braid-gallery-video", title: "Gallery · Beautifully braided", href: "/gallery/beautifully-braided" }, { type: "starter", id: "hair-service-video", title: "Services · Braids & styling", href: "/services/hair-styling" }],
  },
  {
    id: "starter-video-silk", secureUrl: "/assets/videos/05-blush-satin.mp4", resourceType: "video", format: "mp4", bytes: 1468945, width: 1280, height: 720, duration: 10, alt: "Abstract pink satin motion background", caption: "", focal: { x: .5, y: .5 }, provenance: "campaign", generated: true, consentConfirmed: false, actualItem: false, status: "active", revision: 0, starter: true, label: "Blush satin motion", references: [{ type: "starter", id: "site-cta-video", title: "Shared WhatsApp CTA", href: "/" }],
  },
  {
    id: "starter-video-bag", secureUrl: "/assets/videos/06-shopping-bag.mp4", resourceType: "video", format: "mp4", bytes: 2620701, width: 720, height: 1280, duration: 8, alt: "Campaign motion study of KEO Hairven packaging", caption: "", focal: { x: .5, y: .47 }, provenance: "campaign", generated: true, consentConfirmed: false, actualItem: false, status: "active", revision: 0, starter: true, label: "Shopping bag motion", references: [{ type: "starter", id: "about-bag-video", title: "About · brand story motion", href: "/about" }],
  },
];

export function getStarterMediaLibrary() {
  return starterMedia.filter((item) => !new Set(["starter-nails-inspiration","starter-customer-bag","starter-video-nails","starter-video-silk","starter-video-bag"]).has(item.id)).map((item) => ({ ...item, references: [...item.references] }));
}

function timestampMillis(value: unknown) {
  return adminTimeMillis(value) || 0;
}

function safeProvenance(value: unknown): AdminMediaProvenance {
  return ["real-work", "inspiration", "campaign", "actual-product", "service-media", "business-evidence"].includes(String(value))
    ? value as AdminMediaProvenance
    : "inspiration";
}

export function mediaLibraryFromDoc(id: string, raw: Record<string, any>): AdminLibraryMedia {
  const originalFilename = typeof raw.originalFilename === "string" ? raw.originalFilename.trim().slice(0, 180) : undefined;
  const alt = typeof raw.alt === "string" ? raw.alt : "";
  const publicId = typeof raw.publicId === "string" ? raw.publicId : undefined;
  const label = originalFilename || alt || publicId?.split("/").pop()?.replace(/[-_]+/g, " ") || (raw.resourceType === "video" ? "Untitled video" : "Untitled image");
  return {
    id,
    publicId,
    secureUrl: typeof raw.secureUrl === "string" ? raw.secureUrl : "",
    resourceType: raw.resourceType === "video" ? "video" : "image",
    format: typeof raw.format === "string" ? raw.format : undefined,
    bytes: Number.isFinite(raw.bytes) ? Number(raw.bytes) : undefined,
    width: Number.isFinite(raw.width) ? Number(raw.width) : undefined,
    height: Number.isFinite(raw.height) ? Number(raw.height) : undefined,
    duration: Number.isFinite(raw.duration) ? Number(raw.duration) : undefined,
    dominantColor: typeof raw.dominantColor === "string" ? raw.dominantColor : undefined,
    alt,
    caption: typeof raw.caption === "string" ? raw.caption : "",
    focal: raw.focal && Number.isFinite(raw.focal.x) && Number.isFinite(raw.focal.y)
      ? { x: Math.max(0, Math.min(1, Number(raw.focal.x))), y: Math.max(0, Math.min(1, Number(raw.focal.y))) }
      : { x: .5, y: .5 },
    provenance: safeProvenance(raw.provenance),
    generated: raw.generated === true,
    consentConfirmed: raw.consentConfirmed === true,
    actualItem: raw.actualItem === true,
    originalFilename,
    status: raw.status === "trashed" || raw.deletedAt ? "trashed" : "active",
    revision: Number.isInteger(raw.revision) ? raw.revision : 1,
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : undefined,
    createdAt: timestampMillis(raw.createdAt) || undefined,
    updatedAt: timestampMillis(raw.updatedAt) || undefined,
    deletedAt: timestampMillis(raw.deletedAt) || undefined,
    purgeAt: timestampMillis(raw.purgeAt)||undefined,
    purgeState: typeof raw.purgeState === "string" ? raw.purgeState : undefined,
    references: [],
    label,
  };
}

async function collectReferences() {
  const db = getAdminDb();
  const refs = new Map<string, AdminMediaReference[]>();
  if (!db) return refs;
  const configs = [
    { collection: "products", type: "product" as const, href: (id: string) => `/admin/products/${id}` },
    { collection: "looks", type: "look" as const, href: (id: string) => `/admin/gallery/${id}` },
    { collection: "services", type: "service" as const, href: (id: string) => `/admin/services?edit=${encodeURIComponent(id)}` },
  ];
  await Promise.all(configs.map(async (config) => {
    const snap = await db.collection(config.collection).limit(300).get().catch(() => null);
    snap?.docs.forEach((doc) => {
      const raw = doc.data();
      const ids = Array.isArray(raw.mediaIds) ? raw.mediaIds.filter((value: unknown): value is string => typeof value === "string") : [];
      for (const mediaId of ids) {
        const list = refs.get(mediaId) || [];
        list.push({
          type: config.type,
          id: doc.id,
          title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : `Untitled ${config.type}`,
          status: typeof raw.status === "string" ? raw.status : undefined,
          href: config.href(doc.id),
        });
        refs.set(mediaId, list);
      }
    });
  }));

  const [draftSite, publicSite] = await Promise.all([
    db.collection("settingsDrafts").doc("site").get().catch(() => null),
    db.collection("publicSettings").doc("site").get().catch(() => null),
  ]);
  const addContentReference = (mediaId: unknown, id: string, title: string, status: string) => {
    if (typeof mediaId !== "string" || !mediaId) return;
    const list = refs.get(mediaId) || [];
    if (!list.some((item) => item.type === "content" && item.id === id)) {
      list.push({ type: "content", id, title, status, href: "/admin/content" });
      refs.set(mediaId, list);
    }
  };
  if (draftSite?.exists) {
    const raw = draftSite.data() || {};
    addContentReference(raw.homeHeroMediaId, "home-hero", "Website content · Home hero", "draft");
    addContentReference(raw.aboutMediaId, "about-media", "Website content · About media", "draft");
  }
  if (publicSite?.exists) {
    const content = publicSite.data()?.content || {};
    addContentReference(content.homeHeroMedia?.id, "home-hero", "Website content · Home hero", "published");
    addContentReference(content.aboutMedia?.id, "about-media", "Website content · About media", "published");
  }
  return refs;
}

export async function getAdminMediaLibrary(includeStarters = true): Promise<AdminLibraryMedia[]> {
  const db = getAdminDb();
  const refs = await collectReferences();
  let persisted: AdminLibraryMedia[] = [];
  if (db) {
    const snap = await db.collection("media").limit(300).get().catch(() => null);
    if (snap) persisted = snap.docs
      .map((doc) => ({ ...mediaLibraryFromDoc(doc.id, doc.data()), references: refs.get(doc.id) || [] }))
      .filter((item) => Boolean(item.secureUrl));
  }
  persisted.sort((a, b) => timestampMillis(b.createdAt || b.updatedAt) - timestampMillis(a.createdAt || a.updatedAt));
  if (!includeStarters) return persisted;
  const persistedIds = new Set([...persisted.map((item) => item.id),...await getStarterSuppressions("media")]);
  return [...persisted, ...getStarterMediaLibrary().filter((item) => !persistedIds.has(item.id))];
}

export async function getMediaReferences(id: string) {
  const refs = await collectReferences();
  return refs.get(id) || [];
}

export async function getPersistedMedia(id: string): Promise<AdminLibraryMedia | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection("media").doc(id).get().catch(() => null);
  if (!snap?.exists) return null;
  const item = mediaLibraryFromDoc(snap.id, snap.data() || {});
  item.references = await getMediaReferences(id);
  return item;
}

export async function logMediaAdminAction(actor: string | undefined, action: string, entityId: string, success = true) {
  const db = getAdminDb();
  if (!db) return;
  await db.collection("adminAudit").add({ actor: actor || "admin", action, entityId, success, createdAt: FieldValue.serverTimestamp() }).catch(() => undefined);
}
