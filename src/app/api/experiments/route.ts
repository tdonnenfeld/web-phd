import { NextResponse } from "next/server";
import { mlflowRuns } from "@/lib/integrations";
export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json({configured:Boolean(process.env.MLFLOW_URL),runs:await mlflowRuns()});}catch{return NextResponse.json({error:"MLflow unavailable"},{status:502});}}
