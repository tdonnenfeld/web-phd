import {readdir,lstat,open} from "node:fs/promises";
import {constants} from "node:fs";
import {join} from "node:path";
import {validateVariant,validId} from "@/lib/dataset-metadata";
import {db} from "@/lib/db";

export async function discoverDatasets(){
  const root=process.env.PHD_DATASETS_DIR;
  const available=new Set<string>();
  const warnings:string[]=[];
  if(!root)return {available,warnings,enabled:false};
  try{
    for(const dataset of await readdir(root,{withFileTypes:true})){
      if(!dataset.isDirectory()||!validId(dataset.name))continue;
      for(const variant of await readdir(join(root,dataset.name),{withFileTypes:true})){
        if(!variant.isDirectory()||!validId(variant.name))continue;
        const key=dataset.name+"/"+variant.name;
        try{
          const dir=join(root,dataset.name,variant.name);
          const inventory=await lstat(join(dir,"checksums.sha256"));
          if(!inventory.isFile())throw Error("Missing checksum inventory");
          const file=await open(join(dir,"manifest.json"),constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
          let metadata;
          try{
            const stat=await file.stat();
            if(!stat.isFile()||stat.size>100000)throw Error("Invalid manifest file");
            metadata=validateVariant(JSON.parse(await file.readFile("utf8")));
          }finally{await file.close();}
          if(metadata.dataset_id!==dataset.name||metadata.variant_id!==variant.name||metadata.environment!=="palma")throw Error("Manifest identifiers or environment do not match directory");
          const stored=await db.$transaction(async tx=>{
            await tx.researchDataset.upsert({where:{id:dataset.name},create:{id:dataset.name,title:dataset.name},update:{}});
            return tx.datasetVariant.upsert({where:{datasetId_variantId:{datasetId:dataset.name,variantId:variant.name}},create:{datasetId:dataset.name,variantId:variant.name,metadata},update:{}});
          });
          if(!stored.metadata||typeof stored.metadata!=="object"||Array.isArray(stored.metadata)||stored.metadata.sha256!==metadata.sha256||stored.metadata.environment!=="palma")throw Error("Registered metadata conflicts with local manifest");
          available.add(key);
        }catch{warnings.push(key+": invalid, incomplete or conflicting manifest");}
      }
    }
  }catch{warnings.push("Palma dataset directory unavailable");}
  return {available,warnings,enabled:true};
}
