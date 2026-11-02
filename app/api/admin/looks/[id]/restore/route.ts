import {NextRequest} from "next/server";
import {requireAdminApi,noStoreJson} from "@/lib/admin-api";
import {restoreRecord} from "@/lib/trash-server";
export const runtime="nodejs";
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){const auth=await requireAdminApi(request,true);if("response" in auth)return auth.response;const {id}=await context.params;let body:{expectedRevision?:number}={};try{body=await request.json();}catch{}try{if(!Number.isInteger(body.expectedRevision))throw Error("Refresh before restoring this item.");return noStoreJson({ok:true,...await restoreRecord("looks",id,body.expectedRevision,auth.session.email||"admin")});}catch(e){return noStoreJson({message:e instanceof Error?e.message:"Restore failed."},{status:409});}}
