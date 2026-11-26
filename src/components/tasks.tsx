"use client";
import {LoadingList,LoadingStatus} from "@/components/loading";
import {useEffect,useMemo,useState} from "react";

type Task={id:number;title:string;done:boolean;project_id?:number;due_date?:string|null;created?:string|null};
type SortKey="due_asc"|"due_desc"|"created_desc"|"title_asc"|"status";

export function Tasks(){
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [configured,setConfigured]=useState(false);
  const [error,setError]=useState("");
  const [title,setTitle]=useState("");
  const [projectId,setProjectId]=useState<number|null>(null);
  const [showDone,setShowDone]=useState(false);
  const [sortBy,setSortBy]=useState<SortKey>("due_asc");

  const visible=useMemo(()=>{
    const rows=tasks.filter(t=>showDone||!t.done);
    const deadline=(t:Task)=>t.due_date||"9999-12-31";
    rows.sort((a,b)=>{
      let compare=0;
      if((sortBy==="due_asc"||sortBy==="due_desc")&&Boolean(a.due_date)!==Boolean(b.due_date))return a.due_date?-1:1;
      switch(sortBy){
        case "due_asc": compare=deadline(a).localeCompare(deadline(b));break;
        case "due_desc": compare=deadline(b).localeCompare(deadline(a));break;
        case "created_desc": compare=(b.created||"").localeCompare(a.created||"");break;
        case "title_asc": compare=a.title.localeCompare(b.title,undefined,{sensitivity:"base"});break;
        case "status": compare=Number(a.done)-Number(b.done);break;
      }
      return compare||a.id-b.id;
    });
    return rows;
  },[tasks,showDone,sortBy]);

  async function load(){
    try{
      const r=await fetch("/api/vikunja",{cache:"no-store"});
      const data=await r.json();
      if(!r.ok)throw Error(data.error);
      setTasks(data.tasks??[]);
      setConfigured(data.configured);
      setProjectId(data.project?.id??null);
      setError("");
    }catch(e){setError(String(e));}finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  async function action(payload:Record<string,unknown>){
    setBusy(true);
    try{
      const r=await fetch("/api/vikunja",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(!r.ok)throw Error("Could not update Vikunja");
      setTitle("");await load();
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }

  const doneCount=tasks.filter(t=>t.done).length;
  return <div>
    <div className="page-header"><div><div className="eyebrow">Planning & execution</div><h1>Tasks</h1><p className="muted">PhD project in Vikunja. All changes are saved to that project.</p></div></div>
    {!loading&&!error&&!configured&&<div className="notice">Vikunja integration needs a server-side VIKUNJA_TOKEN.</div>}
    {error&&<p className="error">{error}</p>}
    <form className="panel form" onSubmit={e=>{e.preventDefault();void action({action:"create",projectId,title});}}>
      <h2>New task</h2>
      <div className="grid two">
        <div className="field">Project<div className="pill">PhD</div></div>
        <label className="field">Task title<input className="input" required value={title} onChange={e=>setTitle(e.target.value)}/></label>
      </div>
      <div><button disabled={loading||busy||!configured||projectId===null} className="button">{busy?<LoadingStatus label="Saving…"/>:"Create in Vikunja"}</button></div>
    </form>
    <section className="panel spaced">
      <div className="tasks-heading">
        <div><h2>Task register</h2><p className="muted small">{tasks.length-doneCount} open · {doneCount} completed</p></div>
        <div className="tasks-controls">
          <label className="tasks-toggle"><input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)}/> Show completed</label>
          <label className="tasks-sort">Sort by <select aria-label="Sort tasks" value={sortBy} onChange={e=>setSortBy(e.target.value as SortKey)}>
            <option value="due_asc">Due date (earliest)</option>
            <option value="due_desc">Due date (latest)</option>
            <option value="created_desc">Newest first</option>
            <option value="title_asc">Title (A–Z)</option>
            <option value="status">Status (open first)</option>
          </select></label>
        </div>
      </div>
      <div className="list">
        {visible.map(task=><label key={task.id} className="list-item">
          <div className="toolbar"><input aria-label={"Complete "+task.title} type="checkbox" disabled={busy} checked={task.done} onChange={e=>void action({action:"update",id:task.id,done:e.target.checked,title:task.title})}/>
            <div><div style={{textDecoration:task.done?"line-through":"none"}}>{task.title}</div><span className="muted small">PhD · {task.due_date?.slice(0,10)??"No deadline"}</span></div>
          </div><span className="pill">{task.done?"Done":"Open"}</span>
        </label>)}
        {loading&&<LoadingList label="Loading tasks…"/>}
        {!loading&&!error&&!visible.length&&<div className="empty">{tasks.length&&!showDone?"No open tasks. Enable “Show completed” to see finished work.":"No tasks found."}</div>}
      </div>
    </section>
  </div>;
}
