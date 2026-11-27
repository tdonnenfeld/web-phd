export type Measurement={stage:string;ratio:number|null;bps:number;mse:number;normalized_mse:number|null};

export function parseMeasurements(csv:string):Measurement[]{
  const lines=csv.trim().split(/\r?\n/);
  const headers=lines.shift()?.replace(/^\uFEFF/,"").split(",")??[];
  const required=["bps","mse"];
  if(required.some(h=>!headers.includes(h)))throw Error("CSV does not contain BPS and MSE");
  const rows=lines.filter(Boolean).map(line=>{
    const cells=line.split(",");
    if(cells.length!==headers.length)throw Error("Invalid metric CSV row");
    const get=(key:string)=>cells[headers.indexOf(key)];
    const number=(key:string,optional=false)=>{
      const raw=get(key);
      if(raw===undefined||raw.trim()===""){
        if(optional)return null;
        throw Error("Missing "+key);
      }
      const value=Number(raw);
      if(!Number.isFinite(value)||value<0)throw Error("Invalid "+key);
      return value;
    };
    const bps=number("bps")!,mse=number("mse")!;
    if(bps<=0)throw Error("BPS must be positive");
    return {stage:get("stage")||"Reconstruction",ratio:number("requested_ratio",true),bps,mse,normalized_mse:number("normalized_mse",true)};
  });
  if(!rows.length)throw Error("No measurements");
  const keys=rows.map(r=>r.stage+":"+(r.ratio??r.bps));
  if(new Set(keys).size!==keys.length)throw Error("Duplicate stage/rate measurements");
  return rows;
}

export function matchMeasurements(a:Measurement[],b:Measurement[]){
  return a.flatMap(left=>{
    const right=b.find(r=>r.stage===left.stage&&(left.ratio!==null&&r.ratio!==null?left.ratio===r.ratio:left.ratio===null&&r.ratio===null&&left.bps===r.bps));
    return right?[{left,right}]:[];
  });
}

export function nearlyEqual(a:number,b:number,relative=1e-6){
  return a===b||Math.abs(a-b)<=relative*Math.max(Math.abs(a),Math.abs(b));
}

export const propagationStages=["Projection","Normalization","Absorbance","Padding","Reconstruction"] as const;
export const transitionLabels=["Proj → Norm","Norm → Abs","Abs → Pad","Pad → Recon"] as const;

export function propagationRows(measurements:Measurement[]){
  const groups=new Map<string,Measurement[]>();
  for(const row of measurements){
    if(!propagationStages.some(stage=>stage===row.stage))continue;
    const key=row.ratio===null?"bps:"+row.bps:"ratio:"+row.ratio;
    const group=groups.get(key)??[];
    group.push(row);
    groups.set(key,group);
  }
  return Array.from(groups.values()).filter(group=>group.some(row=>row.stage!=="Reconstruction")).map(group=>{
    const first=group.find(row=>row.stage==="Projection")??group[0];
    const consistent=group.every(row=>row.bps===first.bps);
    const values=propagationStages.slice(1).map((stage,i)=>{
      const before=group.find(row=>row.stage===propagationStages[i])?.normalized_mse;
      const after=group.find(row=>row.stage===stage)?.normalized_mse;
      if(!consistent||before===undefined||before===null||before<=0||after===undefined||after===null||after<0)return null;
      const value=after/before;
      return Number.isFinite(value)?value:null;
    });
    return {ratio:first.ratio,bps:first.bps,consistent,values};
  }).sort((a,b)=>a.bps-b.bps);
}
