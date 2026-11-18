import Link from "next/link";
import { githubRepos } from "@/lib/integrations";
import { GitBranch, ExternalLink } from "lucide-react";
export default function Repositories(){
  const repos=githubRepos();
  return <div><div className="page-header"><div><div className="eyebrow">Code & provenance</div><h1>Repositories</h1><p className="muted">Selected GitHub repositories are used to enrich the research timeline.</p></div></div>
    {!process.env.GITHUB_TOKEN&&<div className="notice">Add GITHUB_TOKEN to enable private repository activity synchronization.</div>}
    <div className="grid two">{repos.map(repo=><div className="panel" key={repo}><div className="toolbar"><GitBranch size={18}/><h3 style={{margin:0}}>{repo}</h3></div><p className="muted">Commits, pull requests, issues and releases appear in the calendar when GitHub is connected.</p><Link className="resource-link" target="_blank" href={"https://github.com/"+repo}>Browse on GitHub <ExternalLink size={13}/></Link></div>)}</div>
    {!repos.length&&<div className="empty">Set GITHUB_REPOS to the comma-separated repositories you want to follow.</div>}
  </div>;
}
