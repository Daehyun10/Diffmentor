export type PullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
};

export type ParsedRepository = {
  owner: string;
  repo: string;
};

const GITHUB_API_BASE_URL = "https://api.github.com";
const MAX_FILES = 30;
const MAX_PATCH_CHARS_PER_FILE = 7000;
const MAX_TOTAL_DIFF_CHARS = 55000;

export function parseGitHubRepositoryUrl(repositoryUrl: string): ParsedRepository {
  const trimmedUrl = repositoryUrl.trim();

  if (!trimmedUrl) {
    throw new Error("Enter a GitHub repository URL.");
  }

  const shorthandMatch = trimmedUrl.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shorthandMatch && !trimmedUrl.includes("github.com")) {
    return {
      owner: shorthandMatch[1],
      repo: shorthandMatch[2].replace(/\.git$/, "")
    };
  }

  const sshMatch = trimmedUrl.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2]
    };
  }

  let url: URL;
  try {
    url = new URL(trimmedUrl);
  } catch {
    throw new Error("Enter a valid GitHub repository URL.");
  }

  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    throw new Error("Only github.com repository URLs are supported.");
  }

  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !rawRepo) {
    throw new Error("Could not find owner/repo in the repository URL.");
  }

  return {
    owner,
    repo: rawRepo.replace(/\.git$/, "")
  };
}

export async function fetchPullRequestFiles(
  repository: ParsedRepository,
  pullRequestNumber: number,
  token: string
): Promise<PullRequestFile[]> {
  const allFiles: PullRequestFile[] = [];

  for (let page = 1; page <= 4; page += 1) {
    const response = await fetch(
      `${GITHUB_API_BASE_URL}/repos/${repository.owner}/${repository.repo}/pulls/${pullRequestNumber}/files?per_page=100&page=${page}`,
      {
        headers: createGitHubHeaders(token),
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(createGitHubErrorMessage(response.status));
    }

    const pageFiles = (await response.json()) as PullRequestFile[];
    allFiles.push(...pageFiles);

    if (pageFiles.length < 100 || allFiles.length >= MAX_FILES) {
      break;
    }
  }

  return allFiles.slice(0, MAX_FILES);
}

export async function createPullRequestComment(params: {
  repository: ParsedRepository;
  pullRequestNumber: number;
  token: string;
  body: string;
}): Promise<string | null> {
  const response = await fetch(
    `${GITHUB_API_BASE_URL}/repos/${params.repository.owner}/${params.repository.repo}/issues/${params.pullRequestNumber}/comments`,
    {
      method: "POST",
      headers: createGitHubHeaders(params.token),
      body: JSON.stringify({ body: params.body })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create PR comment. ${createGitHubErrorMessage(response.status)}`);
  }

  const data = (await response.json()) as { html_url?: string };
  return data.html_url ?? null;
}

export function buildDiffForReview(files: PullRequestFile[]): string {
  let totalChars = 0;
  const sections: string[] = [];

  for (const file of files) {
    if (!file.patch) {
      sections.push([
        `## File: ${file.filename}`,
        `Status: ${file.status}`,
        `Changes: +${file.additions} -${file.deletions}`,
        "Patch is unavailable from GitHub API. This can happen for binary files or very large diffs."
      ].join("\n"));
      continue;
    }

    const trimmedPatch = truncateText(file.patch, MAX_PATCH_CHARS_PER_FILE);
    const section = [
      `## File: ${file.filename}`,
      `Status: ${file.status}`,
      `Changes: +${file.additions} -${file.deletions}`,
      "```diff",
      trimmedPatch,
      "```"
    ].join("\n");

    if (totalChars + section.length > MAX_TOTAL_DIFF_CHARS) {
      sections.push(
        [
          "## Diff truncated",
          "Some files were excluded because the pull request diff was too long for one review request."
        ].join("\n")
      );
      break;
    }

    totalChars += section.length;
    sections.push(section);
  }

  return sections.join("\n\n");
}

function createGitHubHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "ai-code-reviewer",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function createGitHubErrorMessage(status: number): string {
  if (status === 401) {
    return "GitHub token is missing, invalid, or expired. (status: 401)";
  }

  if (status === 403) {
    return "GitHub token does not have enough permission or rate limit was exceeded. (status: 403)";
  }

  if (status === 404) {
    return "Repository or Pull Request was not found. Check the URL, PR number, and token permissions. (status: 404)";
  }

  return `GitHub API request failed. (status: ${status})`;
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n\n[Diff truncated: too long to include completely]`;
}
