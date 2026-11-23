import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {literatureFields,maxFieldLength} from "@/lib/literature-csv";
type Context={params:Promise<{id:string}>};
export async function PATCH(request:NextRequest,{params}:Context){
  try{
    const {id}=await params;
    const body=await request.json();
    if(!body||typeof body!=="object")throw Error("Invalid update");
    const fields=Object.keys(body);
    if(fields.length!==1||!literatureFields.includes(fields[0] as typeof literatureFields[number]))throw Error("Update exactly one supported field");
    const field=fields[0] as typeof literatureFields[number];
    const value=body[field];
    if(typeof value!=="string"||value.length>maxFieldLength[field]||(field==="paper"&&!value.trim()))throw Error("Invalid field value");
    const result=await db.literaturePaper.update({where:{id},data:{[field]:value}});
    return NextResponse.json(result);
  }catch{return NextResponse.json({error:"Could not update literature entry"},{status:400});}
}
export async function DELETE(_request:Request,{params}:Context){
  try{
    const {id}=await params;
    await db.literaturePaper.delete({where:{id}});
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:"Literature entry not found"},{status:404});}
}
