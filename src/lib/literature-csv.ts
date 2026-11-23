export const literatureFields=["paper","authors","year","journal","imageType","notes"] as const;
export type LiteratureField=typeof literatureFields[number];
export type LiteratureInput=Record<LiteratureField,string>;
export const maxFieldLength:Record<LiteratureField,number>={paper:1500,authors:3000,year:30,journal:1500,imageType:1500,notes:100000};
export function validateLiterature(value:unknown):LiteratureInput {
  if(!value||typeof value!=="object")throw Error("Invalid literature row");
  const row=value as Record<string,unknown>;
  const result={} as LiteratureInput;
  for(const field of literatureFields){
    if(typeof row[field]!=="string"||row[field].length>maxFieldLength[field])throw Error("Invalid "+field);
    result[field]=row[field] as string;
  }
  if(!result.paper.trim())throw Error("Paper title is required");
  return result;
}
export function parseLiteratureCsv(input:string):LiteratureInput[]{
  if(input.length>2_000_000)throw Error("CSV exceeds 2 MB");
  const csv=input.replace(/^\uFEFF/,"");
  const rows:string[][]=[];
  let row:string[]=[],value="",quoted=false,afterQuote=false;
  for(let i=0;i<csv.length;i++){
    const c=csv[i];
    if(quoted){
      if(c==='"'&&csv[i+1]==='"'){value+='"';i++;}
      else if(c==='"'){quoted=false;afterQuote=true;}
      else value+=c;
    }else if(c==='"'&&!value&&!afterQuote){quoted=true;}
    else if(c===';'||c===',' && rows.length===0 && csv.slice(0,csv.indexOf("\n")).includes(",") && !csv.slice(0,csv.indexOf("\n")).includes(";")){
      row.push(value);value="";afterQuote=false;
    }else if(c==="\n"||c==="\r"){
      if(c==="\r"&&csv[i+1]==="\n")i++;
      row.push(value);value="";afterQuote=false;
      if(row.some(v=>v!==""))rows.push(row);
      row=[];
    }else if(afterQuote&&c===" "){continue;}
    else if(afterQuote)throw Error("Unexpected content after quoted CSV field");
    else value+=c;
  }
  if(quoted)throw Error("Unterminated quoted CSV field");
  if(value||row.length){row.push(value);if(row.some(v=>v!==""))rows.push(row);}
  if(!rows.length)throw Error("Empty CSV");
  const header=rows.shift()!.map(s=>s.trim().toLowerCase());
  const expected=["paper","authors","year","journal","image type","notes"];
  if(header.length!==6||header.some((h,i)=>h!==expected[i]))throw Error("Expected columns: Paper;Authors;Year;Journal;Image type;Notes");
  if(rows.length>1000)throw Error("CSV contains too many papers");
  return rows.filter(row=>row.some(v=>v.trim()!=="")).map(row=>{
    if(row.length!==6)throw Error("CSV row must have exactly six fields");
    const [paper,authors,year,journal,imageType,notes]=row;
    return validateLiterature({paper,authors,year,journal,imageType,notes});
  });
}
