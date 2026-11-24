import type {Prisma} from "@prisma/client";

export function validId(value:unknown):value is string{
  return typeof value==="string"&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
}

function object(value:unknown):value is Record<string,unknown>{
  return typeof value==="object"&&value!==null&&!Array.isArray(value);
}

export function validateVariant(value:unknown):Prisma.InputJsonObject & {dataset_id:string;variant_id:string}{
  if(!object(value)||JSON.stringify(value).length>100000)throw Error("Invalid or oversized metadata");
  const {schema_version,dataset_id,variant_id,shape,dtype,sampling,environment,sha256,calibration,geometry}=value;
  const keys=["schema_version","dataset_id","variant_id","shape","dtype","sampling","environment","sha256","calibration","geometry"];
  if(Object.keys(value).some(k=>!keys.includes(k)))throw Error("Unknown metadata field");
  if(schema_version!==1||!validId(dataset_id)||!validId(variant_id))throw Error("Invalid schema version or identifiers");
  if(!Array.isArray(shape)||shape.length!==3||!shape.every(n=>Number.isSafeInteger(n)&&n>0))throw Error("Shape must contain three positive integers");
  if(typeof dtype!=="string"||!dtype.trim()||dtype.length>100)throw Error("Invalid dtype");
  if(environment!=="palma"&&environment!=="cluster")throw Error("Invalid environment");
  if(typeof sha256!=="string"||!/^[a-f0-9]{64}$/.test(sha256))throw Error("A SHA-256 checksum is required");
  if(!object(sampling)||!["full","detector_rows","angular","crop","downsample","slab"].includes(String(sampling.method)))throw Error("Invalid sampling method");
  if(Object.keys(sampling).some(k=>!["method","detector_rows","projection_indices","parent_sha256","script_commit"].includes(k)))throw Error("Unknown sampling field");
  for(const key of ["detector_rows","projection_indices"]){
    const indices=sampling[key];
    if(indices!==undefined&&(!Array.isArray(indices)||!indices.every(n=>Number.isSafeInteger(n)&&n>=0)||new Set(indices).size!==indices.length))throw Error("Invalid sampling indices");
  }
  for(const [key,length] of [["parent_sha256",64],["script_commit",40]] as const){
    const item=sampling[key];
    if(item!==undefined&&(typeof item!=="string"||!new RegExp("^[a-f0-9]{"+length+"}$").test(item)))throw Error("Invalid sampling provenance");
  }
  if((calibration!==undefined&&!object(calibration))||(geometry!==undefined&&!object(geometry)))throw Error("Invalid calibration or geometry");
  return value as Prisma.InputJsonObject & {dataset_id:string;variant_id:string};
}
