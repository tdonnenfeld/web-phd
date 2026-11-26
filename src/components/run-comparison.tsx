"use client";
import {useEffect,useState} from "react";
import {RDCurves} from "@/components/rd-curves";
import {LoadingStatus} from "@/components/loading";
import {parseMeasurements,matchMeasurements,nearlyEqual,type Measurement} from "@/lib/compare-metrics";

type Run={id:string;runKey:string;manifest:{repository:string;commit:string;status:string;dataset_id:string;variant_id:string;dataset_sha256?:string;parameters?:unknown;metric_definitions?:Record<string,string>};files:{path:string}[]};
function metricFile(run:Run){return ["metrics.csv","summary.csv"].find(p=>run.files.some(f=>f.path===p));}
async function read(run:Run,signal:AbortSignal){
  const path=metricFile(run);
  if(!path)throw Error("No supported metrics CSV");
  const response=await fetch("/api/runs/"+encodeURIComponent(run.id)+"/file?"+new URLSearchParams({path}),{signal});
  if(!response.ok)throw Error("Could not read metrics for "+run.runKey);
  return parseMeasurements(await response.text());
}
const fmt=(x:number|null)=>x===null?"—":x.toPrecision(6);
function canonical(value:unknown):string{
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object")return "{"+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+":"+canonical(v)).join(",")+"}";
  return JSON.stringify(value)??"";
}
export function RunComparison({runs}:{runs:Run[]}){
  const eligible=runs.filter(r=>r.manifest.status==="completed"&&metricFile(r));
  const [left,setLeft]=useState("");
  const [right,setRight]=useState("");
  const [result,setResult]=useState<{a:Measurement[];b:Measurement[]}|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const a=eligible.find(r=>r.id===left),b=eligible.find(r=>r.id===right);
  useEffect(()=>{
    setResult(null);setError("");
    if(!a||!b||left===right){setLoading(false);return;}
    const controller=new AbortController();
    setLoading(true);
    Promise.all([read(a,controller.signal),read(b,controller.signal)]).then(([a,b])=>{if(!controller.signal.aborted)setResult({a,b});}).catch(e=>{if(!controller.signal.aborted)setError(String(e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[left,right,Boolean(a),Boolean(b)]);
  if(eligible.length<2)return null;
  const sameDataset=Boolean(a?.manifest.dataset_sha256&&a.manifest.dataset_sha256===b?.manifest.dataset_sha256&&a.manifest.dataset_id===b?.manifest.dataset_id&&a.manifest.variant_id===b?.manifest.variant_id);
  const sameParameters=Boolean(a?.manifest.parameters&&b?.manifest.parameters&&canonical(a.manifest.parameters)===canonical(b.manifest.parameters));
  const sameDefinitions=Boolean(a?.manifest.metric_definitions&&b?.manifest.metric_definitions&&canonical(a.manifest.metric_definitions)===canonical(b.manifest.metric_definitions));
  const pairs=result?matchMeasurements(result.a,result.b):[];
  const label=(r:Run)=>r.runKey+" · "+r.manifest.repository.split("/").pop()+" · "+r.manifest.variant_id;
  return <section className="panel spaced">
    <h3>Compare runs</h3>
    <p className="muted small">Compare imported metrics without rerunning the experiments.</p>
    <div className="grid two">
      <label className="field">Reference run<select value={left} onChange={e=>setLeft(e.target.value)}><option value="">Select run</option>{eligible.map(r=><option key={r.id} value={r.id} disabled={r.id===right}>{label(r)}</option>)}</select></label>
      <label className="field">Comparison run<select value={right} onChange={e=>setRight(e.target.value)}><option value="">Select run</option>{eligible.map(r=><option key={r.id} value={r.id} disabled={r.id===left}>{label(r)}</option>)}</select></label>
    </div>
    {a&&b&&<div className="spaced">
      <p className="muted small">A: {a.manifest.repository} @ {a.manifest.commit.slice(0,12)}<br/>B: {b.manifest.repository} @ {b.manifest.commit.slice(0,12)}</p>
      <p className="muted small">Dataset checksum: {sameDataset?"matches":"different or unavailable"} · Parameters: {sameParameters?"match":"different or unavailable"} · Metric definitions: {sameDefinitions?"match":"different or unavailable"}</p>
      {(!sameDataset||!sameParameters||!sameDefinitions)&&<p className="notice">These runs are not established as equivalent experimental conditions. Compare descriptively; do not infer numerical equivalence.</p>}
    </div>}
    {loading&&<LoadingStatus label="Loading metrics…"/>}
    {error&&<p className="error" role="alert">{error}</p>}
    {result&&<div className="spaced">
      <RDCurves key={left+":"+right} series={[{label:"A · "+(a?.manifest.repository.split("/").pop()??"Reference"),rows:result.a},{label:"B · "+(b?.manifest.repository.split("/").pop()??"Comparison"),rows:result.b}]}/>
      <p className="muted small">{pairs.length} matched stage/rate pairs · {result.a.length-pairs.length} unmatched in A · {result.b.length-pairs.length} unmatched in B. Matched by requested ratio when present, otherwise exact achieved BPS.</p>
      {pairs.length>0&&<div className="comparison-scroll"><table className="comparison-table"><thead><tr>{["Stage","Ratio","BPS A","BPS B","MSE A","MSE B","NMSE A","NMSE B","MSE change","Within tolerance"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>
      {pairs.map(({left:l,right:r})=><tr key={l.stage+":"+(l.ratio??l.bps)}><td>{l.stage}</td><td>{l.ratio===null?"—":l.ratio+"×"}</td><td>{fmt(l.bps)}</td><td>{fmt(r.bps)}</td><td>{fmt(l.mse)}</td><td>{fmt(r.mse)}</td><td>{fmt(l.normalized_mse)}</td><td>{fmt(r.normalized_mse)}</td><td>{l.mse===0?"—":((r.mse-l.mse)/l.mse*100).toPrecision(4)+"%"}</td><td>{nearlyEqual(l.bps,r.bps)&&nearlyEqual(l.mse,r.mse)&&l.normalized_mse!==null&&r.normalized_mse!==null&&nearlyEqual(l.normalized_mse,r.normalized_mse)?"Yes":"No / unavailable"}</td></tr>)}
      </tbody></table></div>}
      <p className="muted small">Tolerance: relative 1e-6, no absolute floor. Zero reference MSE has undefined percentage change. Matching metrics alone does not prove identical reconstructed arrays.</p>
    </div>}
  </section>;
}
