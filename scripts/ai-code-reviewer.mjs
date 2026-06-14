#!/usr/bin/env node
import fs from "node:fs/promises";
import process from "node:process";
import OpenAI from "openai";

const GITHUB_API_BASE_URL = "https://api.github.com";
const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_OPTIONS = {
  audience: "beginner",
  focus: "general",
  language: "ko",
  style: "mentor"
};

main().catch((error) => {
  console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const options = {
    audience: args.audience ?? DEFAULT_OPTIONS.audience,
    focus: args.focus ?? DEFAULT_OPTIONS.focus,
    language: args.language ?? DEFAULT_OPTIONS.language,
    style: args.style ?? DEFAULT_OPTIONS.style
  };

  const repository = args.repo ? parseRepository(args.repo) : readRepositoryFromEnv();
  const pullRequestNumber = Number(args.pr ?? process.env.PR_NUMBER);
  const githubToken = args.githubToken ?? process.env.GITHUB_TOKEN;
  const openAiApiKey = args.openaiApiKey ?? process.env.OPENAI_API_KEY;
  const demoMode = Boolean(args.demo) || !openAiApiKey || (!githubToken && !args.diffFile);

  if (!Number.isInteger(pullRequestNumber) || pullRequestNumber <= 0) {
    throw new Error("Pass a valid PR number with --pr <number> or PR_NUMBER.");
  }

  let review;
  let reviewedFileCount = 0;

  if (demoMode) {
    review = createDemoReview({ repository, pullRequestNumber, options });
    reviewedFileCount = 3;
  } else {
    const diff = args.diffFile
      ? await fs.readFile(args.diffFile, "utf8")
      : await fetchPullRequestDiff({ repository, pullRequestNumber, token: githubToken });

    reviewedFileCount = args.diffFile ? 1 : countDiffFiles(diff);
    review = await generateReview({
      apiKey: openAiApiKey,
      repository,
      pullRequestNumber,
      diff,
      options
    });
  }

  const output = [
    "<!-- ai-code-reviewer -->",
    `<!-- repo=${repository.owner}/${repository.repo} pr=${pullRequestNumber} files=${reviewedFileCount} -->`,
    review
  ].join("\n\n");

  if (args.output) {
    await fs.writeFile(args.output, output, "utf8");
  }

  if (args.postComment) {
    if (!githubToken) {
      throw new Error("--post-comment requires GITHUB_TOKEN.");
    }

    const commentUrl = await createPullRequestComment({
      repository,
      pullRequestNumber,
      token: githubToken,
      body: output
    });
    console.error(`Posted PR comment: ${commentUrl ?? "done"}`);
  }

  if (!args.quiet) {
    console.log(output);
  }
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--demo") args.demo = true;
    else if (arg === "--post-comment") args.postComment = true;
    else if (arg === "--quiet") args.quiet = true;
    else if (arg === "--repo") args.repo = readValue(arg, next, () => index += 1);
    else if (arg === "--pr") args.pr = readValue(arg, next, () => index += 1);
    else if (arg === "--diff-file") args.diffFile = readValue(arg, next, () => index += 1);
    else if (arg === "--output") args.output = readValue(arg, next, () => index += 1);
    else if (arg === "--audience") args.audience = readValue(arg, next, () => index += 1);
    else if (arg === "--focus") args.focus = readValue(arg, next, () => index += 1);
    else if (arg === "--language") args.language = readValue(arg, next, () => index += 1);
    else if (arg === "--style") args.style = readValue(arg, next, () => index += 1);
    else if (arg === "--github-token") args.githubToken = readValue(arg, next, () => index += 1);
    else if (arg === "--openai-api-key") args.openaiApiKey = readValue(arg, next, () => index += 1);
    else throw new Error(`Unknown option: ${arg}`);
  }

  return args;
}

function readValue(name, value, advance) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  advance();
  return value;
}

function printHelp() {
  console.log(`
AI Code Reviewer

Usage:
  ai-code-reviewer --repo owner/repo --pr 123
  ai-code-reviewer --repo https://github.com/owner/repo --pr 123 --post-comment
  ai-code-reviewer --repo owner/repo --pr 123 --diff-file changes.diff

Options:
  --repo <owner/repo|url>       GitHub repository
  --pr <number>                Pull Request number
  --diff-file <path>           Review a local diff instead of fetching GitHub files
  --post-comment               Post the Markdown review to the PR
  --output <path>              Write Markdown review to a file
  --audience <beginner|intermediate|senior>
  --focus <general|security|performance|frontend|testing>
  --language <ko|en>
  --style <mentor|checklist|strict>
  --demo                       Run without external API calls
  --quiet                      Do not print review to stdout
`);
}

function parseRepository(input) {
  const trimmed = input.trim();
  const shorthand = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shorthand && !trimmed.includes("github.com")) {
    return { owner: shorthand[1], repo: shorthand[2].replace(/\.git$/, "") };
  }

  const ssh = trimmed.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (ssh) {
    return { owner: ssh[1], repo: ssh[2] };
  }

  const url = new URL(trimmed);
  const [owner, repo] = url.pathname.split("/").filter(Boolean);

  if (!owner || !repo) {
    throw new Error("Could not parse repository. Use owner/repo or a GitHub URL.");
  }

  return { owner, repo: repo.replace(/\.git$/, "") };
}

function readRepositoryFromEnv() {
  if (!process.env.GITHUB_REPOSITORY) {
    throw new Error("Pass --repo owner/repo or set GITHUB_REPOSITORY.");
  }

  return parseRepository(process.env.GITHUB_REPOSITORY);
}

async function fetchPullRequestDiff({ repository, pullRequestNumber, token }) {
  const files = [];

  for (let page = 1; page <= 4; page += 1) {
    const response = await fetch(
      `${GITHUB_API_BASE_URL}/repos/${repository.owner}/${repository.repo}/pulls/${pullRequestNumber}/files?per_page=100&page=${page}`,
      { headers: githubHeaders(token) }
    );

    if (!response.ok) {
      throw new Error(`GitHub API failed while fetching PR files. Status: ${response.status}`);
    }

    const pageFiles = await response.json();
    files.push(...pageFiles);

    if (pageFiles.length < 100 || files.length >= 30) {
      break;
    }
  }

  return buildDiffForReview(files.slice(0, 30));
}

function buildDiffForReview(files) {
  let totalChars = 0;
  const sections = [];

  for (const file of files) {
    const patch = file.patch ?? "Patch is unavailable from GitHub API.";
    const trimmedPatch = truncateText(patch, 7000);
    const section = [
      `## File: ${file.filename}`,
      `Status: ${file.status}`,
      `Changes: +${file.additions} -${file.deletions}`,
      "```diff",
      trimmedPatch,
      "```"
    ].join("\n");

    if (totalChars + section.length > 55000) {
      sections.push("## Diff truncated\nSome files were excluded because this PR is too large.");
      break;
    }

    totalChars += section.length;
    sections.push(section);
  }

  return sections.join("\n\n");
}

async function generateReview({ apiKey, repository, pullRequestNumber, diff, options }) {
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    input: createPrompt({ repository, pullRequestNumber, diff, options }),
    temperature: 0.2
  });

  const text = response.output_text?.trim();
  if (!text) {
    throw new Error("OpenAI API did not return a review.");
  }

  return text;
}

function createPrompt({ repository, pullRequestNumber, diff, options }) {
  const outputLanguage = options.language === "ko" ? "Korean" : "English";

  return `
You are a principal-level AI Pull Request reviewer and mentor.
Return a production-quality ${outputLanguage} Markdown review for ${repository.owner}/${repository.repo}#${pullRequestNumber}.

Audience: ${options.audience}
Focus: ${options.focus}
Style: ${options.style}

Rules:
- Focus only on the provided diff.
- Do not invent issues. Every issue must be grounded in the changed diff or a directly implied behavior.
- If context is missing, say what cannot be verified.
- Prioritize correctness, security, performance, maintainability, testing, accessibility, and operational risk.
- Severity guide: High means likely production bug, security issue, data loss, broken user flow, or serious regression. Medium means realistic bug, missing edge case, brittle design, or meaningful maintenance risk. Low means polish, clarity, test coverage, or small maintainability improvement.
- Explain why each issue matters.
- Include practical fix examples when useful.
- Include Review Snapshot, What Went Well, Blocking Or High-Risk Issues, Issues And Suggestions, Test Plan Suggestions, Learning Notes, and Final Summary.
- For each issue include Location, Evidence from diff, Problem, Why it matters, When it fails, Suggested fix, Suggested test, Confidence, and optional Example code.

Diff:

${diff}
`.trim();
}

function createDemoReview({ repository, pullRequestNumber, options }) {
  return `
# AI Code Review

> Demo mode. No external APIs were called.

Review profile:
- Target: ${repository.owner}/${repository.repo}#${pullRequestNumber}
- Audience: ${options.audience}
- Focus: ${options.focus}
- Style: ${options.style}

## What Went Well
- The review output is Markdown, which makes it useful in terminals, web pages, and PR comments.
- The product idea has a clear user: developers who want review feedback they can learn from.

## Review Snapshot
- Overall risk: Medium
- Release recommendation: Approve with follow-up
- Main reason: The core flow is understandable, but production usage needs stronger error handling, testing, and token-budget controls.

## Blocking Or High-Risk Issues
- No blocking issues found in the provided demo diff.

## Issues And Suggestions

### 1. [Severity: Medium] Add actionable error messages
- Location: GitHub API request handling
- Evidence from diff: GitHub API failures are surfaced through a generic failure path.
- Problem: Generic errors make it hard to know whether the token, URL, or PR number is wrong.
- Why it matters: Beginner users need the product to tell them what to try next.
- When it fails: A user reviews a private repository with a token that lacks access and receives a message that does not explain permissions.
- Suggested fix: Return status-specific messages for 401, 403, and 404.
- Suggested test: Mock GitHub responses for 401, 403, and 404 and assert the returned message is actionable.
- Confidence: High

### 2. [Severity: Low] Keep reviews token-aware
- Location: Diff preparation
- Evidence from diff: PR patches are collected and sent to the model after truncation.
- Problem: Large diffs can exceed model input limits.
- Why it matters: A predictable truncation strategy keeps cost and latency under control.
- When it fails: A PR touches generated files or lockfiles and crowds out the meaningful application diff.
- Suggested fix: Cap each file patch and the total diff size.
- Suggested test: Add a fixture with many large files and assert the final prompt stays below the configured budget.
- Confidence: High

## Test Plan Suggestions
- Unit tests: repository URL parsing, diff truncation, review option normalization.
- Integration or E2E tests: API route returns demo mode without keys and real-mode validation with mocked GitHub responses.
- Manual checks: submit a small PR, a large PR, and a PR with binary files.

## Learning Notes
- A mentor-style review explains the reason behind a suggestion, not only the change.

## Final Summary
- This demo shows the full review shape without requiring API keys.
`.trim();
}

async function createPullRequestComment({ repository, pullRequestNumber, token, body }) {
  const response = await fetch(
    `${GITHUB_API_BASE_URL}/repos/${repository.owner}/${repository.repo}/issues/${pullRequestNumber}/comments`,
    {
      method: "POST",
      headers: githubHeaders(token),
      body: JSON.stringify({ body })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create PR comment. Status: ${response.status}`);
  }

  const data = await response.json();
  return data.html_url ?? null;
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "ai-code-reviewer",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function truncateText(text, maxChars) {
  return text.length <= maxChars
    ? text
    : `${text.slice(0, maxChars)}\n\n[Diff truncated: too long to include completely]`;
}

function countDiffFiles(diff) {
  const matches = diff.match(/^## File:/gm);
  return matches ? matches.length : 1;
}
