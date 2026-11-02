import {NextResponse} from "next/server";
export async function POST(){return NextResponse.json({message:"The AI assistant is unavailable. Please contact KEO Hairven directly."},{status:503});}
