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
