"use client";
import {useEffect,useState} from "react";
type Run={info:{run_id:string;experiment_id:string;start_time?:number};data?:{metrics?:Array<{key:string;value:number}>;tags?:Array<{key:string;value:string}>}};
export function Experiments(){
  const [runs,setRuns]=useState<Run[]>([]),[configured,setConfigured]=useState(false),[error,setError]=useState("");
  useEffect(()=>{fetch("/api/experiments").then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error);setRuns(j.runs);setConfigured(j.configured);}).catch(e=>setError(String(e)));},[]);
  return <div><div className="page-header"><div><div className="eyebrow">Reproducible research</div><h1>Experiments</h1><p className="muted">MLflow runs, scientific measurements and code provenance.</p></div></div>
    {!configured&&<div className="notice">Configure MLFLOW_URL to connect your experiment tracking server.</div>}{error&&<p className="error">{error}</p>}
    <div className="grid two">{runs.map(run=><div className="panel" key={run.info.run_id}><span className="pill">Experiment {run.info.experiment_id}</span><h3 style={{marginTop:12}}>{run.data?.tags?.find(t=>t.key==="mlflow.runName")?.value??run.info.run_id.slice(0,10)}</h3><p className="muted small">{run.info.start_time?new Date(run.info.start_time).toLocaleString():"No timestamp"} · Run {run.info.run_id.slice(0,12)}</p><div className="list">{run.data?.metrics?.slice(0,8).map(m=><div className="list-item" key={m.key}><span>{m.key}</span><strong>{Number(m.value).toPrecision(5)}</strong></div>)}</div></div>)}</div>
    {!runs.length&&<div className="empty">Runs will appear here once MLflow is connected and your Python pipeline starts logging experiments.</div>}
  </div>;
}
