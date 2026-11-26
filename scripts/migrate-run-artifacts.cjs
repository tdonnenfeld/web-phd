const {PrismaClient}=require("@prisma/client");
const {createHash,randomUUID}=require("node:crypto");
const {mkdir,writeFile,rename,rm,readFile}=require("node:fs/promises");
const {join}=require("node:path");
const db=new PrismaClient();

async function main(){
  const root=process.env.PHD_ARTIFACTS_DIR;
  if(!root)throw Error("PHD_ARTIFACTS_DIR is missing");
  let count=0;
  while(true){
    const files=await db.runFile.findMany({where:{digest:null},select:{runId:true,path:true},take:50});
    if(!files.length)break;
    for(const key of files){
      const file=await db.runFile.findUnique({where:{runId_path:key}});
      if(!file||file.digest)continue;
      if(!file.content)throw Error("Missing legacy content");
      const digest=createHash("sha256").update(file.content).digest("hex");
      const dir=join(root,digest.slice(0,2)),path=join(dir,digest),temp=path+"."+randomUUID()+".part";
      await mkdir(dir,{recursive:true,mode:0o700});
      try{
        await writeFile(temp,file.content,{flag:"wx",mode:0o600});
        await rename(temp,path);
      }finally{await rm(temp,{force:true});}
      const saved=await readFile(path);
      if(saved.length!==file.content.byteLength||createHash("sha256").update(saved).digest("hex")!==digest)throw Error("Artifact verification failed");
      const result=await db.runFile.updateMany({where:{...key,digest:null},data:{content:null,digest,size:saved.length}});
      count+=result.count;
    }
  }
  console.log("Migrated "+count+" legacy files");
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
