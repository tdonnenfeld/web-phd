"use client";
import {useState} from "react";
import {propagationRows,transitionLabels,type Measurement} from "@/lib/compare-metrics";

type Series={label:string;rows:Measurement[]};
function format(value:number|null){return value===null?"—":value===0?"0":value.toPrecision(4)+"×";}
function cellColor(value:number|null){
  if(value===null||value===1)return "transparent";
  const strength=value===0?1:Math.min(1,Math.abs(Math.log2(value))/2);
  return value<1?`rgba(137,180,250,${0.12+0.48*strength})`:`rgba(243,139,168,${0.12+0.48*strength})`;
}

export function PropagationComparison({series}:{series:Series[]}){
  const runs=series.map(s=>({label:s.label,rows:propagationRows(s.rows)}));
  const ratios=Array.from(new Set(runs.flatMap(s=>s.rows.map(r=>r.ratio)).filter((r):r is number=>r!==null))).sort((a,b)=>a-b);
  const [selected,setSelected]=useState("all");
  const shown=runs.map(s=>({...s,rows:s.rows.filter(r=>selected==="all"||String(r.ratio)===selected)})).filter(s=>s.rows.length);
  if(!runs.some(s=>s.rows.length))return null;
  return <section className="spaced">
    <h3>Error propagation across runs</h3>
    <p className="muted small">Each cell is the next stage's NMSE divided by the preceding stage's NMSE, using the same run and achieved bitrate. Values below 1 decrease; above 1 increase.</p>
    <div className="toolbar spaced">
      <label className="field">Requested ratio<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">All measured rates</option>{ratios.map(r=><option key={r} value={String(r)}>{r}×</option>)}</select></label>
      <span className="propagation-key" style={{background:cellColor(0.25)}}>≤ 0.25×</span>
      <span className="propagation-key" style={{background:cellColor(1)}}>1×</span>
      <span className="propagation-key" style={{background:cellColor(4)}}>≥ 4×</span>
    </div>
    <div className="comparison-scroll spaced"><table className="comparison-table propagation-table">
      <thead><tr><th>Run</th><th>Ratio</th><th>Actual BPS</th>{transitionLabels.map(t=><th key={t}>{t}</th>)}</tr></thead>
      <tbody>{shown.flatMap((s,i)=>s.rows.map((row,j)=><tr key={i+":"+j}>
        <td>{j===0?s.label:""}</td><td>{row.ratio===null?"—":row.ratio+"×"}</td><td>{row.bps.toPrecision(6)}</td>
        {row.values.map((v,k)=><td key={k} style={{background:cellColor(v)}} title={v===null?"Undefined: missing NMSE, zero denominator or inconsistent bitrate":String(v)}>{format(v)}</td>)}
      </tr>))}</tbody>
    </table></div>
    {runs.filter(s=>!s.rows.length).map((s,i)=><p className="muted small" key={i}>{s.label}: no stage propagation measurements.</p>)}
    <p className="muted small">Values are raw ratios, not logarithms. The shared color scale is centered at 1× and saturates at 0.25× and 4×. Undefined ratios are shown as —, never as zero. Actual BPS may differ across runs at the same requested ratio. NMSE uses each sample's own reference range.</p>
  </section>;
}
