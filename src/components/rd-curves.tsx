"use client";
import {useId,useState} from "react";
import type {Measurement} from "@/lib/compare-metrics";

type Metric="mse"|"normalized_mse";
type Series={label:string;rows:Measurement[]};
const colors=["#89b4fa","#f9e2af"];
const format=(n:number)=>n===0?"0":n.toPrecision(4);

export function RDCurves({series}:{series:Series[]}){
  const stages=Array.from(new Set(series.flatMap(s=>s.rows.map(r=>r.stage))));
  const [chosen,setChosen]=useState("Reconstruction");
  const [metric,setMetric]=useState<Metric>("normalized_mse");
  const [log,setLog]=useState(true);
  const [hidden,setHidden]=useState<number[]>([]);
  const [active,setActive]=useState<string|null>(null);
  const titleId=useId();
  const stage=stages.includes(chosen)?chosen:stages[0];
  const available=series.map((s,i)=>({...s,i,points:s.rows.filter(r=>r.stage===stage&&r[metric]!==null).map(r=>({x:r.bps,y:r[metric]!,ratio:r.ratio})).sort((a,b)=>a.x-b.x)}));
  const visible=available.filter(s=>!hidden.includes(s.i));
  const omitted=visible.reduce((n,s)=>n+s.points.filter(p=>log&&p.y===0).length,0);
  const plotted=visible.map(s=>({...s,points:s.points.filter(p=>!log||p.y>0)}));
  const points=plotted.flatMap(s=>s.points);
  const xValues=points.map(p=>p.x),yValues=points.map(p=>log?Math.log10(p.y):p.y);
  const domain=(values:number[],floorZero=false)=>{
    let low=Math.min(...values),high=Math.max(...values);
    const pad=low===high?(Math.abs(low)*0.1||1):(high-low)*0.06;
    low-=pad;high+=pad;
    return [floorZero?Math.max(0,low):low,high];
  };
  const [xmin,xmax]=domain(xValues,true),[ymin,ymax]=domain(yValues,!log);
  const x=(v:number)=>76+530*(v-xmin)/(xmax-xmin);
  const y=(v:number)=>24+260*(1-((log?Math.log10(v):v)-ymin)/(ymax-ymin));
  const selected=plotted.flatMap(s=>s.points.map((p,j)=>({...p,key:s.i+":"+j,label:s.label}))).find(p=>p.key===active);
  return <section className="spaced rd-curves" aria-labelledby={titleId}>
    <h3 id={titleId}>Rate–distortion curves</h3>
    <div className="toolbar">
      <label className="field">Stage<select value={stage??""} onChange={e=>{setChosen(e.target.value);setActive(null);}}>{stages.map(s=><option key={s}>{s}</option>)}</select></label>
      <label className="field">Distortion<select value={metric} onChange={e=>{setMetric(e.target.value as Metric);setActive(null);}}><option value="normalized_mse">Range-normalized MSE</option><option value="mse">MSE</option></select></label>
      <label className="pill"><input type="checkbox" checked={log} onChange={e=>{setLog(e.target.checked);setActive(null);}}/> Log Y axis</label>
    </div>
    <div className="toolbar spaced">{available.map(s=><label className="pill" key={s.i}><input type="checkbox" checked={!hidden.includes(s.i)} onChange={e=>{setHidden(old=>e.target.checked?old.filter(i=>i!==s.i):[...old,s.i]);setActive(null);}}/><span className="rd-swatch" style={{background:colors[s.i%colors.length]}}/>{s.label}{!s.points.length?" (no data)":""}</label>)}</div>
    {points.length===0?<p className="muted spaced">No plottable measurements for this selection. Try MSE or a linear axis.</p>:<div className="rd-plot">
      <svg viewBox="0 0 630 330" role="group" aria-label={stage+" rate–distortion graph"}>
        {Array.from({length:5},(_,i)=>{
          const v=ymin+(ymax-ymin)*i/4,py=284-i*65;
          return <g key={i}><line x1="76" x2="606" y1={py} y2={py} stroke="var(--border)"/><text x="69" y={py+4} textAnchor="end">{format(log?10**v:v)}</text></g>;
        })}
        {Array.from({length:5},(_,i)=>{
          const v=xmin+(xmax-xmin)*i/4,px=76+i*132.5;
          return <g key={i}><line x1={px} x2={px} y1="24" y2="284" stroke="var(--border)"/><text x={px} y="301" textAnchor="middle">{format(v)}</text></g>;
        })}
        <text x="341" y="323" textAnchor="middle">Achieved bitrate (BPS)</text>
        <text transform="translate(14 154) rotate(-90)" textAnchor="middle">{metric==="mse"?"MSE":"Normalized MSE"}</text>
        {plotted.map(s=><g key={s.i} stroke={colors[s.i%colors.length]} fill={colors[s.i%colors.length]}>
          {s.points.length>1&&<polyline points={s.points.map(p=>x(p.x)+","+y(p.y)).join(" ")} fill="none" strokeWidth="2" strokeDasharray={s.i===1?"6 4":undefined}/>}
          {s.points.map((p,j)=><circle key={j} cx={x(p.x)} cy={y(p.y)} r={active===s.i+":"+j?6:4} stroke="var(--bg)" strokeWidth="1.5" tabIndex={0} role="button" aria-label={s.label+", "+format(p.x)+" BPS, "+format(p.y)} onMouseEnter={()=>setActive(s.i+":"+j)} onFocus={()=>setActive(s.i+":"+j)} onClick={()=>setActive(s.i+":"+j)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setActive(s.i+":"+j);}}}><title>{s.label}: {p.x} BPS, {p.y}</title></circle>)}
        </g>)}
      </svg>
      <div className="rd-readout" aria-live="polite">{selected?<>{selected.label} · {selected.ratio!==null?selected.ratio+"× · ":""}{format(selected.x)} BPS · {metric==="mse"?"MSE":"NMSE"} {selected.y.toPrecision(8)}</>:"Hover, focus or select a point to inspect its measurement."}</div>
    </div>}
    {omitted>0&&<p className="muted small">{omitted} zero-error point{omitted===1?" is":"s are"} omitted from the logarithmic axis. Switch to linear to see them.</p>}
    <p className="muted small">Points use achieved bitrate, not target ratio. Lines connect measured rates only; they do not establish a continuous rate–distortion model.</p>
  </section>;
}
