import Link from "next/link";
import { githubRepos } from "@/lib/integrations";
import { GitBranch, ExternalLink, KeyRound } from "lucide-react";
export const dynamic = "force-dynamic";

export default function Repositories(){
  const repos = githubRepos();
  const configured = Boolean(process.env.GITHUB_TOKEN?.trim());
  return <div>
    <div className="page-header"><div><div className="eyebrow">Code & provenance</div><h1>Repositories</h1><p className="muted">GitHub source activity from your selected repositories.</p></div></div>
    {!configured&&<div className="notice"><KeyRound size={16} style={{verticalAlign:"middle"}}/> GitHub API token is not present in the running application. A GitHub Actions repository secret is not automatically available to a Docker container. Configure <code>github_token</code> in the encrypted VPS Ansible Vault, deploy the <code>web_phd</code> role, and recreate <code>phd-web</code> to load the updated environment.</div>}
    {configured&&<div className="notice" role="status">GitHub API token is configured in the application environment. Repository access still depends on the token's permissions; check the activity timeline to verify successful imports.</div>}
    <div className="grid two">{repos.map(repo=><div className="panel" key={repo}><div className="toolbar"><GitBranch size={18}/><h3 style={{margin:0}}>{repo}</h3></div><p className="muted">Commits, pull requests, issues and releases appear in the journal and calendar when the GitHub API is accessible.</p><Link className="resource-link" target="_blank" href={"https://github.com/"+repo}>Browse on GitHub <ExternalLink size={13}/></Link></div>)}</div>
    {!repos.length&&<div className="empty">Set GITHUB_REPOS to the repositories you want to follow.</div>}
  </div>;
}
