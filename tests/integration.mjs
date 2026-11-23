import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {setTimeout as sleep} from "node:timers/promises";

const origin=process.env.TEST_ORIGIN??"http://127.0.0.1:3100";
const auth={"Remote-User":"tester"};
const marker="CI-smoke-"+randomUUID();
let id,linkId,experimentId,literatureId;
async function call(path,{method="GET",body,authenticated=true}={}){
  const response=await fetch(origin+path,{method,headers:{...(authenticated?auth:{}),...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,redirect:"manual"});
  let result;try{result=await response.json();}catch{result=null;}
  return {status:response.status,result};
}
async function untilReady(){
  for(let i=0;i<60;i++){try{const r=await call("/api/journal",{authenticated:false});if(r.status===401)return;}catch{}await sleep(1000);}
  throw Error("Next.js did not start or private route protection failed");
}
await untilReady();
// Quartz uses relative URLs for index.css, scripts, and static/contentIndex.json.
// The browser must land on /knowledge/index.html, not bare /knowledge.
const knowledge = await fetch(origin+"/knowledge",{headers:auth,redirect:"manual"});
assert.equal(knowledge.status,307,"Quartz homepage should redirect to a folder-aware URL");
assert.equal(knowledge.headers.get("location"),"/knowledge/index.html");
console.log("PASS: Quartz canonical URL preserves relative static asset paths");
const folder = await fetch(origin+"/knowledge/PhD/",{headers:auth,redirect:"manual"});
assert.notEqual(folder.status,308,"Next.js must preserve trailing slashes for Quartz folder pages");
assert(!String(folder.headers.get("location")??"").includes("phd-quartz"),"Never expose internal Docker hostname");
console.log("PASS: Quartz folder links are not stripped of their trailing slash");
try{
  const blocked=await call("/api/journal",{authenticated:false});
  assert.equal(blocked.status,401,"Unauthenticated journal must be blocked");
  assert.equal((await call("/api/journal",{authenticated:true})).status,200,"Allowed user must read journal");
  const created=await call("/api/journal",{method:"POST",body:{date:"2026-11-18",title:marker,content:"Original hypothesis",period:"DAY"}});
  assert.equal(created.status,201,JSON.stringify(created));
  id=created.result.id;
  console.log("PASS: authenticated journal creation");
  const month=await call("/api/journal?month=2026-11");
  assert.equal(month.status,200);
  assert(month.result.some(e=>e.id===id),"Entry must persist and appear in monthly view");
  assert(!(await call("/api/journal?month=2026-12")).result.some(e=>e.id===id),"Month filter should exclude November entry");
  console.log("PASS: journal persistence and month filtering");
  const obsidian=month.result.find(e=>e.source==="obsidian"&&e.title==="Reconstruction notes");
  assert(obsidian,"Obsidian daily note must appear in the journal");
  assert.equal(obsidian.date.slice(0,10),"2026-11-20");
  assert(obsidian.content.includes("MSE improved."),"Obsidian note Markdown must be preserved");
  assert.equal(obsidian.period,"DAY");
  assert.equal((await call("/api/journal?month=2026-12")).result.filter(e=>e.source==="obsidian").length,0);
  console.log("PASS: read-only Obsidian daily note appears in journal only for its month");
  const changed=await call("/api/journal/"+id,{method:"PATCH",body:{date:"2026-11-18",title:marker+" updated",content:"Revised scientific interpretation",period:"WEEK"}});
  assert.equal(changed.status,200);
  assert.equal(changed.result.content,"Revised scientific interpretation");
  console.log("PASS: journal edit");
  const linked=await call("/api/journal/"+id+"/links",{method:"POST",body:{source:"github",externalId:"a".repeat(40),label:"Reconstruction commit",url:"https://github.com/tdonnenfeld/web-phd/commit/"+"a".repeat(40)}});
  assert.equal(linked.status,200,JSON.stringify(linked));linkId=linked.result.id;
  const persisted=(await call("/api/journal?month=2026-11")).result.find(e=>e.id===id);
  assert.equal(persisted.links[0].externalId,"a".repeat(40));
  console.log("PASS: persistent journal-to-commit link");
  const csvText='Paper;Authors;Year;Journal;Image type;Notes\n"'+marker+'";"A. Example; B. Example";2026;"Journal";"Absorption CT";"Line one\nLine two; with delimiter"\n;;;;;\n';
  const imported=await call("/api/literature",{method:"POST",body:{action:"import",csv:csvText}});
  assert.equal(imported.status,200,JSON.stringify(imported));
  assert.equal(imported.result.imported,1,"CSV import should exclude empty rows");
  const importedAgain=await call("/api/literature",{method:"POST",body:{action:"import",csv:csvText}});
  assert.equal(importedAgain.status,200);
  assert.equal(importedAgain.result.imported,0,"CSV import must be idempotent");
  const literature=await call("/api/literature");assert.equal(literature.status,200);
  const literaturePaper=literature.result.papers.find(p=>p.paper===marker);
  assert(literaturePaper,"Imported literature row missing");
  literatureId=literaturePaper.id;
  assert.equal(literaturePaper.authors,"A. Example; B. Example");
  assert.equal(literaturePaper.notes,"Line one\nLine two; with delimiter");
  const changedPaper=await call("/api/literature/"+literatureId,{method:"PATCH",body:{notes:"New note\nSecond line"}});
  assert.equal(changedPaper.status,200);assert.equal(changedPaper.result.notes,"New note\nSecond line");
  const invalidPaper=await call("/api/literature/"+literatureId,{method:"PATCH",body:{id:"something else"}});
  assert.equal(invalidPaper.status,400,"Only editable columns should be accepted");
  const unauthLiterature=await call("/api/literature",{authenticated:false});
  assert.equal(unauthLiterature.status,401,"Unauthenticated bibliography must be private");
  console.log("PASS: CSV literature import, exact notes, deduplication, editing, and auth");
  const tasks=await call("/api/vikunja");assert.equal(tasks.status,200,JSON.stringify(tasks));assert.equal(tasks.result.project.title,"PhD");assert.deepEqual(tasks.result.tasks.map(t=>t.id),[101],"Other-project tasks must never be returned");
  const invalidCreate=await call("/api/vikunja",{method:"POST",body:{action:"create",projectId:8,title:"Do not create elsewhere"}});assert.notEqual(invalidCreate.status,200,"Writing to unrelated projects must be blocked");
  const invalidUpdate=await call("/api/vikunja",{method:"POST",body:{action:"update",id:201,title:"Personal grocery shopping",done:true}});assert.notEqual(invalidUpdate.status,200,"Updating unrelated tasks must be blocked");
  const taskCreated=await call("/api/vikunja",{method:"POST",body:{action:"create",projectId:7,title:"CI task"}});assert.equal(taskCreated.status,200,JSON.stringify(taskCreated));assert.equal(taskCreated.result.id,102);
  const taskUpdated=await call("/api/vikunja",{method:"POST",body:{action:"update",id:102,title:"CI task",done:true}});assert.equal(taskUpdated.status,200);assert.equal(taskUpdated.result.done,true);
  console.log("PASS: Vikunja read/create/complete against mocked API");
  const before=await call("/api/experiments");
  assert.equal(before.status,200,JSON.stringify(before));
  const denied=await call("/api/experiments",{method:"POST",body:{title:"Invalid",description:"",sourceType:"github",repository:"other/private",sourcePath:"README.md"}});
  assert.equal(denied.status,400,"Unapproved GitHub repository must be rejected");
  const invalidNote=await call("/api/experiments",{method:"POST",body:{title:"Invalid",description:"",sourceType:"obsidian",sourcePath:"obsidian:../../etc/passwd"}});
  assert.equal(invalidNote.status,400,"Invalid Obsidian note must be rejected");
  const createdExperiment=await call("/api/experiments",{method:"POST",body:{title:marker+" experiment",description:"Compare reconstructed MSE",sourceType:"obsidian",sourcePath:obsidian.id}});
  assert.equal(createdExperiment.status,201,JSON.stringify(createdExperiment));
  experimentId=createdExperiment.result.id;
  assert.equal(createdExperiment.result.sourceType,"obsidian");
  const listed=await call("/api/experiments");assert.equal(listed.status,200);
  assert(listed.result.experiments.some(e=>e.id===experimentId),"Experiment was not persisted");
  const report=await call("/api/experiment-sources/content?type=obsidian&id="+encodeURIComponent(obsidian.id));
  assert.equal(report.status,200);assert(report.result.content.includes("MSE improved."));
  console.log("PASS: experiment creation from Obsidian, persistence, source rendering and allowlist validation");
  const activity=await call("/api/activity?month=2026-11");assert.equal(activity.status,200);assert(activity.result.some(x=>x.source==="vikunja"),"Vikunja activity absent");assert(!activity.result.some(x=>x.id==="vikunja:task:201"),"Unrelated tasks must be excluded from calendar activity");assert(!activity.result.some(x=>x.source==="mlflow"),"MLflow should be disconnected");
  console.log("PASS: combined calendar activity feed");
} finally {
  if(literatureId){const result=await call("/api/literature/"+literatureId,{method:"DELETE"});assert.equal(result.status,200);}
  if(experimentId){const result=await call("/api/experiments/"+experimentId,{method:"DELETE"});assert.equal(result.status,200);}
  if(linkId){const result=await call("/api/links/"+linkId,{method:"DELETE"});assert.equal(result.status,200);}
  if(id){const result=await call("/api/journal/"+id,{method:"DELETE"});assert.equal(result.status,200);const check=await call("/api/journal?month=2026-11");assert(!check.result.some(e=>e.id===id),"Test entry leaked");}
  console.log("PASS: journal and link cleanup");
}
