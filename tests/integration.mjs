import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {setTimeout as sleep} from "node:timers/promises";

const origin=process.env.TEST_ORIGIN??"http://127.0.0.1:3100";
const auth={"Remote-User":"tester"};
const marker="CI-smoke-"+randomUUID();
let id,linkId;
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
  const changed=await call("/api/journal/"+id,{method:"PATCH",body:{date:"2026-11-18",title:marker+" updated",content:"Revised scientific interpretation",period:"WEEK"}});
  assert.equal(changed.status,200);
  assert.equal(changed.result.content,"Revised scientific interpretation");
  console.log("PASS: journal edit");
  const linked=await call("/api/journal/"+id+"/links",{method:"POST",body:{source:"github",externalId:"a".repeat(40),label:"Reconstruction commit",url:"https://github.com/tdonnenfeld/web-phd/commit/"+"a".repeat(40)}});
  assert.equal(linked.status,200,JSON.stringify(linked));linkId=linked.result.id;
  const persisted=(await call("/api/journal?month=2026-11")).result.find(e=>e.id===id);
  assert.equal(persisted.links[0].externalId,"a".repeat(40));
  console.log("PASS: persistent journal-to-commit link");
  const tasks=await call("/api/vikunja");assert.equal(tasks.status,200,JSON.stringify(tasks));assert.equal(tasks.result.project.title,"PhD");assert.deepEqual(tasks.result.tasks.map(t=>t.id),[101],"Other-project tasks must never be returned");
  const invalidCreate=await call("/api/vikunja",{method:"POST",body:{action:"create",projectId:8,title:"Do not create elsewhere"}});assert.notEqual(invalidCreate.status,200,"Writing to unrelated projects must be blocked");
  const invalidUpdate=await call("/api/vikunja",{method:"POST",body:{action:"update",id:201,title:"Personal grocery shopping",done:true}});assert.notEqual(invalidUpdate.status,200,"Updating unrelated tasks must be blocked");
  const taskCreated=await call("/api/vikunja",{method:"POST",body:{action:"create",projectId:7,title:"CI task"}});assert.equal(taskCreated.status,200,JSON.stringify(taskCreated));assert.equal(taskCreated.result.id,102);
  const taskUpdated=await call("/api/vikunja",{method:"POST",body:{action:"update",id:102,title:"CI task",done:true}});assert.equal(taskUpdated.status,200);assert.equal(taskUpdated.result.done,true);
  console.log("PASS: Vikunja read/create/complete against mocked API");
  const experiments=await call("/api/experiments");assert.equal(experiments.status,200,JSON.stringify(experiments));assert.equal(experiments.result.runs[0].data.metrics[0].value,43.2);
  console.log("PASS: MLflow experiment and metric retrieval against mocked API");
  const activity=await call("/api/activity?month=2026-11");assert.equal(activity.status,200);assert(activity.result.some(x=>x.source==="vikunja"),"Vikunja activity absent");assert(!activity.result.some(x=>x.id==="vikunja:task:201"),"Unrelated tasks must be excluded from calendar activity");assert(activity.result.some(x=>x.source==="mlflow"),"MLflow activity absent");
  console.log("PASS: combined calendar activity feed");
} finally {
  if(linkId){const result=await call("/api/links/"+linkId,{method:"DELETE"});assert.equal(result.status,200);}
  if(id){const result=await call("/api/journal/"+id,{method:"DELETE"});assert.equal(result.status,200);const check=await call("/api/journal?month=2026-11");assert(!check.result.some(e=>e.id===id),"Test entry leaked");}
  console.log("PASS: journal and link cleanup");
}
