import {inflateRawSync} from "node:zlib";
import {validId} from "@/lib/dataset-metadata";
import type {Prisma} from "@prisma/client";

export const MAX_BUNDLE=32*1024*1024;
const MAX_FILE=12*1024*1024;
const MAX_TOTAL=64*1024*1024;
const extensions=/\.(json|csv|md|png|jpe?g|webp|ya?ml|log|txt)$/i;
export function safePath(path:string){
  return path.length<=400&&path.split("/").every(p=>/^[A-Za-z0-9_-][A-Za-z0-9_. -]*$/.test(p))&&extensions.test(path);
}
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==="object"&&!Array.isArray(v);}
export function validateRun(v:unknown){
  if(!record(v)||JSON.stringify(v).length>100000)throw Error("Invalid manifest");
  const {schema_version,experiment_id,run_id,repository,commit,environment,dataset_id,variant_id,dataset_sha256,status,parameters,created_at,metric_definitions,duration_seconds,software,workflow_run_id}=v;
  const keys=["schema_version","experiment_id","run_id","repository","commit","environment","dataset_id","variant_id","dataset_sha256","status","parameters","created_at","metric_definitions","duration_seconds","software","workflow_run_id"];
  if(Object.keys(v).some(k=>!keys.includes(k))||schema_version!==1||![experiment_id,run_id,dataset_id,variant_id].every(validId))throw Error("Invalid manifest identifiers");
  if(typeof repository!=="string"||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)||typeof commit!=="string"||! /^[a-f0-9]{40}$/.test(commit))throw Error("Invalid repository or commit");
  if(environment!=="palma"&&environment!=="cluster"||status!=="completed"&&status!=="failed")throw Error("Invalid environment or status");
  if(typeof dataset_sha256!=="string"||!/^[a-f0-9]{64}$/.test(dataset_sha256))throw Error("Invalid dataset checksum");
  if(!record(parameters)||!record(metric_definitions)||!Object.values(metric_definitions).every(x=>typeof x==="string"))throw Error("Invalid parameters or metrics");
  if(typeof created_at!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i.test(created_at)||!Number.isFinite(Date.parse(created_at)))throw Error("Invalid execution date");
  if(duration_seconds!==undefined&&(typeof duration_seconds!=="number"||!Number.isFinite(duration_seconds)||duration_seconds<0))throw Error("Invalid duration");
  if(software!==undefined&&(!record(software)||!Object.values(software).every(x=>typeof x==="string")))throw Error("Invalid software");
  if(workflow_run_id!==undefined&&(typeof workflow_run_id!=="number"||!Number.isSafeInteger(workflow_run_id)||workflow_run_id<1))throw Error("Invalid workflow ID");
  return v as Prisma.InputJsonObject & {experiment_id:string;run_id:string;dataset_id:string;variant_id:string;dataset_sha256:string;environment:string;status:string};
}

function crc32(data:Buffer){
  let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
export function unpackBundle(zip:Buffer){
  if(zip.length>MAX_BUNDLE||zip.length<22)throw Error("Invalid ZIP size");
  let end=zip.length-22;
  while(end>=Math.max(0,zip.length-65557)){
    if(zip.readUInt32LE(end)===0x06054b50&&end+22+zip.readUInt16LE(end+20)===zip.length)break;
    end--;
  }
  if(end<Math.max(0,zip.length-65557))throw Error("Missing ZIP directory");
  const count=zip.readUInt16LE(end+10), size=zip.readUInt32LE(end+12), start=zip.readUInt32LE(end+16);
  if(zip.readUInt16LE(end+4)||zip.readUInt16LE(end+6)||zip.readUInt16LE(end+8)!==count||count>512||start+size!==end)throw Error("Unsupported ZIP directory");
  const files=new Map<string,Buffer>();
  let pos=start,total=0;
  for(let i=0;i<count;i++){
    if(pos+46>end||zip.readUInt32LE(pos)!==0x02014b50)throw Error("Invalid ZIP entry");
    const flags=zip.readUInt16LE(pos+8), method=zip.readUInt16LE(pos+10), crc=zip.readUInt32LE(pos+16), compressed=zip.readUInt32LE(pos+20), length=zip.readUInt32LE(pos+24);
    const n=zip.readUInt16LE(pos+28), extra=zip.readUInt16LE(pos+30), comment=zip.readUInt16LE(pos+32), offset=zip.readUInt32LE(pos+42);
    const mode=zip.readUInt32LE(pos+38)>>>16;
    if(pos+46+n+extra+comment>end||flags&~0x808||![0,8].includes(method)||zip.readUInt16LE(pos+34)||(mode&0xf000)===0xa000)throw Error("Unsupported ZIP entry");
    const name=zip.toString("utf8",pos+46,pos+46+n);
    pos+=46+n+extra+comment;
    if(!safePath(name)||files.has(name)||length>MAX_FILE||total+length>MAX_TOTAL)throw Error("Unsafe path, duplicate or oversized file");
    if(offset+30>start||zip.readUInt32LE(offset)!==0x04034b50||zip.readUInt16LE(offset+6)!==flags||zip.readUInt16LE(offset+8)!==method)throw Error("Invalid ZIP local header");
    const localName=zip.readUInt16LE(offset+26), localExtra=zip.readUInt16LE(offset+28), dataStart=offset+30+localName+localExtra;
    if(dataStart+compressed>start||zip.toString("utf8",offset+30,offset+30+localName)!==name)throw Error("Invalid ZIP file bounds");
    const raw=zip.subarray(dataStart,dataStart+compressed);
    const data=method===0?raw:inflateRawSync(raw,{maxOutputLength:Math.max(1,length)});
    if(data.length!==length||crc32(data)!==crc)throw Error("ZIP checksum or size mismatch");
    if(/\.png$/i.test(name)&&!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error("Invalid PNG");
    if(/\.jpe?g$/i.test(name)&&!(data[0]===255&&data[1]===216&&data[2]===255))throw Error("Invalid JPEG");
    if(/\.webp$/i.test(name)&&!(data.toString("ascii",0,4)==="RIFF"&&data.toString("ascii",8,12)==="WEBP"))throw Error("Invalid WebP");
    files.set(name,data);total+=length;
  }
  if(pos!==end||!files.has("manifest.json"))throw Error("Missing manifest or invalid directory");
  const manifest=validateRun(JSON.parse(files.get("manifest.json")!.toString("utf8")));
  if(manifest.status==="completed"&&!files.has("results.md"))throw Error("Completed runs require results.md");
  return {manifest,files};
}
