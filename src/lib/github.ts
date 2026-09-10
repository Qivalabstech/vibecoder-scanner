export interface GithubRepo {
  id: number;
  full_name: string;
  private: boolean;
  html_url: string;
  permissions?: { admin?: boolean; push?: boolean; pull?: boolean };
}

const GITHUB_API = "https://api.github.com";

/** Repos the authenticated GitHub user has admin or push (write) access to. */
export async function listAdminRepos(accessToken: string): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `${GITHUB_API}/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const batch = (await res.json()) as GithubRepo[];
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
    if (page > 10) break; // hard cap — 1000 repos is plenty for an MVP listing
  }

  return repos.filter((r) => r.permissions?.admin || r.permissions?.push);
}

/**
 * Server-side re-check that the current token still grants admin/push on
 * `fullName` — never trust the client's list selection alone.
 */
export async function verifyRepoAccess(accessToken: string, fullName: string): Promise<boolean> {
  const res = await fetch(`${GITHUB_API}/repos/${fullName}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) return false;
  const repo = (await res.json()) as GithubRepo;
  return Boolean(repo.permissions?.admin || repo.permissions?.push);
}
