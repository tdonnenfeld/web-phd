import {createHash,randomUUID} from "node:crypto";
import {mkdir,open,rename,rm,writeFile} from "node:fs/promises";
import {constants} from "node:fs";
import {join} from "node:path";
import {safePath} from "@/lib/run-bundle";

function root(){
  const dir=process.env.PHD_ARTIFACTS_DIR;
  if(!dir)throw Error("Run artifact storage is not configured");
  return dir;
}
function hash(data:Buffer|Uint8Array){
  return createHash("sha256").update(data).digest("hex");
}
function objectPath(digest:string){
  if(!/^[a-f0-9]{64}$/.test(digest))throw Error("Invalid artifact digest");
  return join(root(),digest.slice(0,2),digest);
}
export async function storeArtifact(data:Buffer|Uint8Array){
  const digest=hash(data);
  const path=objectPath(digest);
  await mkdir(join(root(),digest.slice(0,2)),{recursive:true,mode:0o700});
  const temp=path+"."+randomUUID()+".part";
  try{
    await writeFile(temp,data,{flag:"wx",mode:0o600});
    await rename(temp,path);
  }finally{await rm(temp,{force:true});}
  return {digest,size:data.byteLength};
}
export async function storeRunFiles(files:Map<string,Buffer>){
  const records=[];
  for(const [path,data] of files){
    if(!safePath(path))throw Error("Invalid artifact path");
    records.push({path,...await storeArtifact(data)});
  }
  return records;
}
export async function readArtifact(digest:string,size:number){
  if(!Number.isSafeInteger(size)||size<0||size>12*1024*1024)throw Error("Invalid artifact size");
  const handle=await open(objectPath(digest),constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try{
    const stat=await handle.stat();
    if(!stat.isFile()||stat.size!==size)throw Error("Artifact size mismatch");
    const data=await handle.readFile();
    if(data.length!==size||hash(data)!==digest)throw Error("Artifact checksum mismatch");
    return data;
  }finally{await handle.close();}
}
