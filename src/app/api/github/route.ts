import { NextResponse } from "next/server";
import { githubRepos } from "@/lib/integrations";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json({configured:Boolean(process.env.GITHUB_TOKEN),repos:githubRepos()});}
