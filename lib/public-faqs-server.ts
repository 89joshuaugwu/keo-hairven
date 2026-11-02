import {getStarterSuppressions} from "@/lib/categories-server";
import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { publicFaqs, type FaqItem } from "@/lib/faqs";

function fromDoc(id: string, raw: Record<string, any>): (FaqItem & { sortOrder: number }) | null {
  if (typeof raw.question !== "string" || typeof raw.answer !== "string") return null;
  const category = ["getting-started", "appointments", "products-pricing", "waybill-delivery"].includes(raw.group)
    ? raw.group as FaqItem["category"]
    : "getting-started";
  return {
    id,
    category,
    question: raw.question.trim(),
    answer: raw.answer.trim(),
    sortOrder: Number.isFinite(raw.sortOrder) ? Number(raw.sortOrder) : 100,
  };
}

export async function getPublicFaqsServer(): Promise<FaqItem[]> {
  const db = getAdminDb();
  if (!db) return publicFaqs;
  try {
    const [site, snap] = await Promise.all([
      db.collection("publicSettings").doc("site").get(),
      db.collection("publicFaqs").limit(100).get(),
    ]);
    const published = site.exists && site.data()?.content?.published === true;
    if (!published){const suppressed=await getStarterSuppressions("faqs");return publicFaqs.filter(f=>!suppressed.has(f.id));}
    return snap.docs
      .map((doc) => fromDoc(doc.id, doc.data()))
      .filter((item): item is FaqItem & { sortOrder: number } => Boolean(item))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ sortOrder: _sortOrder, ...faq }) => faq);
  } catch {
    return [];
  }
}
