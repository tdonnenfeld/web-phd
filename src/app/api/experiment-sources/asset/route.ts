import {NextRequest,NextResponse} from "next/server";
import {githubFile} from "@/lib/experiment-sources";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams;
  try{
    const {bytes,type}=await githubFile(q.get("repo")??"",q.get("path")??"",q.get("ref")??"");
    if(!["image/png","image/jpeg","image/webp"].includes(type))return NextResponse.json({error:"Unsupported image"},{status:400});
    return new NextResponse(new Uint8Array(bytes),{headers:{"Content-Type":type,"Cache-Control":"private, max-age=3600","X-Content-Type-Options":"nosniff"}});
  }catch{return NextResponse.json({error:"Image not available"},{status:404});}
}
