import { NextRequest } from "next/server";
import { noStoreJson, requireAdminApi } from "@/lib/admin-api";
import { getSiteSetupStatus, importCurrentSiteAsManagedData } from "@/lib/site-setup";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, false);
  if ("response" in auth) return auth.response;
  if (auth.session.role !== "owner") return noStoreJson({ code: "forbidden", message: "Only the owner can manage the starting website data." }, { status: 403 });
  return noStoreJson({ status: await getSiteSetupStatus() });
}

export async function POST() {
  return noStoreJson({ code: "disabled", message: "Importing original site content is disabled for KEO Hairven." }, { status: 410 });
}
