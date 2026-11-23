import { createServer } from "node:http";
const tasks=new Map([[101,{id:101,title:"Review reconstruction results",project_id:7,done:false,due_date:"2026-11-19T12:00:00Z",created:"2026-11-18T10:00:00Z"}],[201,{id:201,title:"Personal grocery shopping",project_id:8,done:false,created:"2026-11-18T10:00:00Z"}]]);
const json=(res,status,data)=>{res.writeHead(status,{"content-type":"application/json"});res.end(JSON.stringify(data));};
const server=createServer(async(req,res)=>{
  let body="";for await(const chunk of req)body+=chunk;
  const path=new URL(req.url,"http://localhost").pathname;
  if(req.headers.authorization!=="Bearer test-token" && path.startsWith("/api/v1/"))return json(res,401,{error:"Missing test token"});
  if(req.method==="GET"&&path==="/api/v1/projects")return json(res,200,[{id:7,title:"PhD"},{id:8,title:"Personal"}]);
  if(req.method==="GET"&&path==="/api/v1/projects/7/tasks")return json(res,200,[...tasks.values()].filter(t=>t.project_id===7));
  if(req.method==="GET"&&path==="/api/v1/projects/8/tasks")return json(res,200,[...tasks.values()].filter(t=>t.project_id===8));
  if(req.method==="GET"&&path==="/api/v1/tasks/101")return json(res,200,tasks.get(101));
  if(req.method==="GET"&&path==="/api/v1/tasks/102")return json(res,200,tasks.get(102));
  if(req.method==="GET"&&path==="/api/v1/tasks/201")return json(res,200,tasks.get(201));
  if(req.method==="GET"&&(path==="/api/v1/tasks"||path==="/api/v1/tasks/all"))return json(res,200,[...tasks.values()]);
  if(req.method==="PUT"&&path==="/api/v1/projects/7/tasks"){
    const input=JSON.parse(body);
    const task={id:102,title:input.title,project_id:7,done:false,created:"2026-11-18T11:00:00Z"};
    tasks.set(task.id,task);return json(res,200,task);
  }
  if(req.method==="POST"&&path.startsWith("/api/v1/tasks/")){
    const id=Number(path.split("/").pop());const task=tasks.get(id);
    if(!task)return json(res,404,{error:"Not found"});
    Object.assign(task,JSON.parse(body));return json(res,200,task);
  }
  if(req.method==="POST"&&path==="/api/2.0/mlflow/experiments/search")return json(res,200,{experiments:[{experiment_id:"5"}]});
  if(req.method==="POST"&&path==="/api/2.0/mlflow/runs/search")return json(res,200,{runs:[{info:{run_id:"run-001",experiment_id:"5",start_time:1795003200000},data:{tags:[{key:"mlflow.runName",value:"Compression QP22"}],metrics:[{key:"psnr",value:43.2}]}}]});
  return json(res,404,{error:"Unexpected mock URL",path,method:req.method});
});
server.listen(3999,"127.0.0.1",()=>console.log("Mock Vikunja and MLflow ready"));
