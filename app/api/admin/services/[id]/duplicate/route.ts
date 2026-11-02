import { writeCategorized, validateMediaAssignment } from "@/lib/categories-server";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireAdminApi, noStoreJson } from "@/lib/admin-api";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAdminService, logServiceAdminAction, slugifyService } from "@/lib/admin-services";
export const runtime="nodejs";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi(request,true); if("response" in auth)return auth.response; const db=getAdminDb(); if(!db)return noStoreJson({code:"database-unavailable",message:"Admin database is not configured."},{status:503});
 const {id}=await context.params; const service=await getAdminService(id); if(!service||service.preview)return noStoreJson({code:"not-found",message:"Save this service before duplicating it."},{status:404});
 let expectedRevision=0;try{expectedRevision=Number(((await request.json())as{expectedRevision?:number}).expectedRevision)}catch{};if(!Number.isInteger(expectedRevision)||expectedRevision!==service.revision)return noStoreJson({code:"revision-conflict",message:"This service changed. Refresh before duplicating it.",currentRevision:service.revision},{status:409});
 const ref=db.collection("services").doc();const title=`${service.title} (copy)`;const slug=`${slugifyService(title)}-${ref.id.slice(0,6).toLowerCase()}`;
 const {id:_id,revision:_revision,status:_status,createdAt:_created,updatedAt:_updated,deletedAt:_deleted,purgeAt:_purgeAt,purgeState:_purgeState,preview:_preview,sourceStarterId:_starter,suppressStarterPublic:_suppressed,slug:_slug,...copy}=service;
 await db.runTransaction(async tx=>{await validateMediaAssignment(tx,service.mediaIds);tx.set(ref,{...copy,title,slug,status:"draft",revision:1,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),deletedAt:null});});
 await logServiceAdminAction(auth.session.email,"service.duplicate",ref.id);return noStoreJson({ok:true,id:ref.id,revision:1});
}
