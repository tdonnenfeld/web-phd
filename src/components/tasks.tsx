"use client";
import {useEffect,useState} from "react";
type Task={id:number;title:string;done:boolean;project_id?:number;due_date?:string|null};
export function Tasks(){
  const [tasks,setTasks]=useState<Task[]>([]);const [configured,setConfigured]=useState(false);const [error,setError]=useState("");const [title,setTitle]=useState("");const [project,setProject]=useState("");
  async function load(){try{const r=await fetch("/api/vikunja");const data=await r.json();if(!r.ok)throw Error(data.error);setTasks(data.tasks??[]);setConfigured(data.configured);setError("");}catch(e){setError(String(e));}}
  useEffect(()=>{void load();},[]);
  async function action(payload:Record<string,unknown>){const r=await fetch("/api/vikunja",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});if(!r.ok){setError("Could not update Vikunja");return;}setTitle("");await load();}
  return <div><div className="page-header"><div><div className="eyebrow">Planning & execution</div><h1>Tasks</h1><p className="muted">Vikunja is the source of truth. Changes here are sent directly to your task server.</p></div></div>
    {!configured&&<div className="notice">Vikunja integration needs a server-side VIKUNJA_TOKEN.</div>}
    {error&&<p className="error">{error}</p>}
    <form className="panel form" onSubmit={e=>{e.preventDefault();void action({action:"create",projectId:Number(project),title});}}><h2>New task</h2><div className="grid two"><label className="field">Project ID<input className="input" required type="number" min="1" value={project} onChange={e=>setProject(e.target.value)}/></label><label className="field">Task title<input className="input" required value={title} onChange={e=>setTitle(e.target.value)}/></label></div><div><button disabled={!configured} className="button">Create in Vikunja</button></div></form>
    <section className="panel spaced"><h2>Current tasks</h2><div className="list">{tasks.map(task=><label key={task.id} className="list-item"><div className="toolbar"><input aria-label={"Complete "+task.title} type="checkbox" checked={task.done} onChange={e=>void action({action:"update",id:task.id,done:e.target.checked,title:task.title})}/><div><div style={{textDecoration:task.done?"line-through":"none"}}>{task.title}</div><span className="muted small">Project {task.project_id??"—"} · {task.due_date?.slice(0,10)??"No deadline"}</span></div></div><span className="pill">{task.done?"Done":"Open"}</span></label>)}{!tasks.length&&<div className="empty">No tasks loaded.</div>}</div></section>
  </div>;
}
