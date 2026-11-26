import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {readArtifact} from "@/lib/run-storage";
import {safePath} from "@/lib/run-bundle";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params,path=request.nextUrl.searchParams.get("path")||"";
  if(!safePath(path))return new NextResponse("Invalid path",{status:400});
  const file=await db.runFile.findUnique({where:{runId_path:{runId:id,path}}});
  if(!file)return new NextResponse("Not found",{status:404});
  let content:Uint8Array;
  try{
    if(file.digest!==null&&file.size!==null)content=await readArtifact(file.digest,file.size);
    else if(file.content!==null)content=file.content;
    else throw Error("Missing artifact");
  }catch{return new NextResponse("Artifact unavailable",{status:503});}
  const mime=/\.png$/i.test(path)?"image/png":/\.jpe?g$/i.test(path)?"image/jpeg":/\.webp$/i.test(path)?"image/webp":"text/plain; charset=utf-8";
  return new NextResponse(Uint8Array.from(content),{headers:{"Content-Type":mime,"X-Content-Type-Options":"nosniff","Cache-Control":"private, no-store","Content-Security-Policy":"default-src 'none'","Content-Disposition":mime.startsWith("image/")?"inline":"attachment"}});
}
