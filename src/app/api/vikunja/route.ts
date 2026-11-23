import { NextRequest,NextResponse } from "next/server";
import { vikunjaTasks,vikunjaPhdProject,writeVikunjaTask } from "@/lib/integrations";
export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json({configured:Boolean(process.env.VIKUNJA_TOKEN),project:await vikunjaPhdProject(),tasks:await vikunjaTasks()});}catch{return NextResponse.json({error:"Could not reach Vikunja"},{status:502});}}
export async function POST(request:NextRequest){
  try{const data=await request.json();if(!["create","update"].includes(data.action))return NextResponse.json({error:"Invalid action"},{status:400});
    const payload={id:data.id,projectId:data.projectId,title:data.title,done:data.done,due_date:data.due_date};
    return NextResponse.json(await writeVikunjaTask(data.action,payload));
  }catch{return NextResponse.json({error:"Vikunja task operation failed"},{status:502});}
}
