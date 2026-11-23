import {NextRequest,NextResponse} from "next/server";
import {githubFile,obsidianSource} from "@/lib/experiment-sources";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams;
  try{
    if(q.get("type")==="obsidian"){
      const source=await obsidianSource(q.get("id")??"");
      return NextResponse.json(source,{headers:{"Cache-Control":"private, no-store"}});
    }
    if(q.get("type")==="github"){
      const source=await githubFile(q.get("repo")??"",q.get("path")??"",q.get("ref")??"");
      if(!["text/markdown; charset=utf-8"].includes(source.type))return NextResponse.json({error:"Markdown required"},{status:400});
      return NextResponse.json({content:source.bytes.toString("utf8")},{headers:{"Cache-Control":"private, no-store"}});
    }
    return NextResponse.json({error:"Invalid source"},{status:400});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Source unavailable"},{status:404});}
}
