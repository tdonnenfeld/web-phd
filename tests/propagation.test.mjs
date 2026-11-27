import {test} from "node:test";
import assert from "node:assert/strict";
import {parseMeasurements,propagationRows} from "../src/lib/compare-metrics.ts";

const csv="requested_ratio,bps,stage,mse,normalized_mse\n8,2,Projection,10,0.1\n8,2,Normalization,20,0.2\n8,2,Absorbance,10,0.1\n8,2,Padding,10,0.1\n8,2,Reconstruction,0,0";
test("raw adjacent stage NMSE ratios",()=>{
  assert.deepEqual(propagationRows(parseMeasurements(csv)),[{ratio:8,bps:2,consistent:true,values:[2,0.5,1,0]}]);
});
test("zero denominator and missing stages remain undefined",()=>{
  const rows=parseMeasurements(csv).filter(r=>r.stage!=="Padding");
  rows[0].normalized_mse=0;
  assert.deepEqual(propagationRows(rows)[0].values,[null,0.5,null,null]);
});
test("never mix bitrates at the same target ratio",()=>{
  const rows=parseMeasurements(csv);
  rows[1].bps=2.1;
  assert.deepEqual(propagationRows(rows)[0].values,[null,null,null,null]);
});
test("reconstruction-only summary is not propagation data",()=>{
  assert.deepEqual(propagationRows(parseMeasurements("bps,mse\n2,0.01")),[]);
});
test("different compression rates remain separate",()=>{
  const rows=parseMeasurements(csv);
  assert.deepEqual(propagationRows([...rows,...rows.map(r=>({...r,ratio:4,bps:4}))]).map(r=>r.bps),[2,4]);
});
