import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {parseLiteratureCsv,validateLiterature} from "@/lib/literature-csv";
export const dynamic="force-dynamic";
export async function GET(){
  try{
    const papers=await db.literaturePaper.findMany({orderBy:{createdAt:"asc"},take:2000});
    return NextResponse.json({papers},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:"Literature database unavailable"},{status:503});}
}
export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    if(body?.action==="import"){
      if(typeof body.csv!=="string")throw Error("CSV text required");
      const rows=parseLiteratureCsv(body.csv);
      const existing=await db.literaturePaper.findMany({select:{paper:true,authors:true,year:true}});
      const keys=new Set(existing.map(r=>JSON.stringify([r.paper.trim().toLowerCase(),r.authors.trim().toLowerCase(),r.year.trim()])));
      const fresh=rows.filter(r=>{
        const key=JSON.stringify([r.paper.trim().toLowerCase(),r.authors.trim().toLowerCase(),r.year.trim()]);
        if(keys.has(key))return false;
        keys.add(key);return true;
      });
      await db.$transaction(fresh.map(row=>db.literaturePaper.create({data:row})));
      return NextResponse.json({imported:fresh.length,skipped:rows.length-fresh.length,total:rows.length},{status:200});
    }
    const row=validateLiterature(body);
    const paper=await db.literaturePaper.create({data:row});
    return NextResponse.json(paper,{status:201});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid input"},{status:400});}
}
