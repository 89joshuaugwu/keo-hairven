import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { productDesignPreview } from "@/lib/products";
import { publicLooks } from "@/lib/gallery";

export type AdminOverviewSource = "live" | "preview";

export type AdminOverviewStat = {
  label: string;
  value: number;
};

export type AdminOverviewChecklistItem = {
  title: string;
  body: string;
};

export type AdminOverviewNextStep = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  action: string;
};

export type AdminOverviewData = {
  source: AdminOverviewSource;
  stats: AdminOverviewStat[];
  checklist: AdminOverviewChecklistItem[];
  nextStep: AdminOverviewNextStep;
};

const previewChecklist: AdminOverviewChecklistItem[] = [
  {
    title: "Confirm product details",
    body: "Create and verify your actual hair product listings.",
  },
  {
    title: "Review product photos",
    body: "Upload the real photos of each product before publishing.",
  },
  {
    title: "Review your gallery",
    body: "Keep your gallery looks and captions up to date.",
  },
  {
    title: "Confirm how customers visit",
    body: "Add an exact address only if you want it public.",
  },
];

function previewData(): AdminOverviewData {
  return {
    source: "preview",
    stats: [
      { label: "PRODUCT DRAFTS", value: productDesignPreview.length },
      { label: "LOOKS TO REVIEW", value: publicLooks.length },
      { label: "PUBLISHED PRODUCTS", value: 0 },
    ],
    checklist: previewChecklist,
    nextStep: {
      eyebrow: "YOUR NEXT SMALL STEP",
      title: "Finish your first product",
      body: "Add photos and confirm the description.",
      href: "/admin/products",
      action: "Continue editing",
    },
  };
}

async function countAll(collectionName: string) {
  const db = getAdminDb();
  if (!db) throw new Error("admin-db-unavailable");
  const snapshot = await db.collection(collectionName).count().get();
  return snapshot.data().count;
}

async function countStatus(collectionName: string, status: string) {
  const db = getAdminDb();
  if (!db) throw new Error("admin-db-unavailable");
  const snapshot = await db.collection(collectionName).where("status", "==", status).count().get();
  return snapshot.data().count;
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const db = getAdminDb();
  if (!db) return previewData();

  try {
    const [
      productTotal,
      productDrafts,
      lookTotal,
      lookDrafts,
      publicProductCount,
      publicLookCount,
    ] = await Promise.all([
      countAll("products"),
      countStatus("products", "draft"),
      countAll("looks"),
      countStatus("looks", "draft"),
      countAll("publicProducts"),
      countAll("publicLooks"),
    ]);

    const anyStoredContent =
      productTotal + lookTotal + publicProductCount + publicLookCount > 0;

    if (!anyStoredContent) return previewData();

    const checklist: AdminOverviewChecklistItem[] = [
      productTotal === 0
        ? {
            title: "Add your first product",
            body: "Create a product and confirm its details before publishing.",
          }
        : productDrafts > 0
          ? {
              title: "Confirm product details",
              body: `${productDrafts} product draft${productDrafts === 1 ? " is" : "s are"} still waiting for review.`,
            }
          : {
              title: "Review current product details",
              body: "Keep prices, descriptions and availability aligned with what you can actually supply.",
            },
      publicProductCount === 0
        ? {
            title: "Review product photos",
            body: "Add at least one product image before publishing.",
          }
        : {
            title: "Keep product photos current",
            body: `${publicProductCount} product${publicProductCount === 1 ? " is" : "s are"} currently represented in the public catalogue.`,
          },
      publicLookCount === 0
        ? {
            title: "Review your gallery",
            body: "Add or update the looks you want customers to browse.",
          }
        : lookDrafts > 0
          ? {
              title: "Review gallery drafts",
              body: `${lookDrafts} look${lookDrafts === 1 ? " is" : "s are"} still waiting for review.`,
            }
          : {
              title: "Review your gallery",
              body: "Keep your gallery titles, descriptions and media current.",
            },
      {
        title: "Confirm how customers visit",
        body: "Keep the general location public; add an exact address only if you want customers to see it.",
      },
    ];

    let nextStep: AdminOverviewNextStep;
    if (productTotal === 0) {
      nextStep = {
        eyebrow: "YOUR NEXT SMALL STEP",
        title: "Add your first product",
        body: "Start a draft, then add the item details and photos.",
        href: "/admin/products/new",
        action: "Add a product",
      };
    } else if (productDrafts > 0) {
      nextStep = {
        eyebrow: "YOUR NEXT SMALL STEP",
        title: "Finish a product draft",
        body: `${productDrafts} draft${productDrafts === 1 ? " is" : "s are"} waiting for your review.`,
        href: "/admin/products",
        action: "Review products",
      };
    } else if (lookDrafts > 0) {
      nextStep = {
        eyebrow: "YOUR NEXT SMALL STEP",
        title: "Review your gallery drafts",
        body: `${lookDrafts} look${lookDrafts === 1 ? " is" : "s are"} ready for a closer look.`,
        href: "/admin/gallery",
        action: "Review gallery",
      };
    } else {
      nextStep = {
        eyebrow: "YOUR NEXT SMALL STEP",
        title: "Keep your storefront fresh",
        body: "Review your homepage, FAQs and business details before your next update.",
        href: "/admin/content",
        action: "Review website content",
      };
    }

    return {
      source: "live",
      stats: [
        { label: "PRODUCT DRAFTS", value: productDrafts },
        { label: "LOOKS TO REVIEW", value: lookDrafts },
        { label: "PUBLISHED PRODUCTS", value: publicProductCount },
      ],
      checklist,
      nextStep,
    };
  } catch {
    return previewData();
  }
}
