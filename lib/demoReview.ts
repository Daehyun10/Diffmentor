import type { ReviewOptions } from "@/lib/reviewOptions";

export function createDemoReview(params: {
  owner: string;
  repo: string;
  pullRequestNumber: number;
  options?: ReviewOptions;
}): string {
  const focusLabel = params.options?.focus ?? "general";
  const audienceLabel = params.options?.audience ?? "beginner";
  const styleLabel = params.options?.style ?? "mentor";

  return `
# AI Code Review

> Demo mode. OPENAI_API_KEY or GITHUB_TOKEN is missing, so this sample review shows the real product flow without calling external APIs.

Review profile:
- Audience: ${audienceLabel}
- Focus: ${focusLabel}
- Style: ${styleLabel}
- Target: ${params.owner}/${params.repo}#${params.pullRequestNumber}

## Review Snapshot
- Overall risk: Medium
- Release recommendation: Approve with follow-up
- Main reason: The core product flow is clear, but production usage depends on strong error handling, diff budgeting, and tests.

## What Went Well
- The change is small enough to review comfortably.
- The structure suggests a clear separation between data fetching, AI prompting, and UI rendering.
- Returning Markdown is a good choice because it works in the web app, CLI, and GitHub PR comments.

## Blocking Or High-Risk Issues
- No blocking issues found in the provided demo diff.

## Issues And Suggestions

### 1. [Severity: Medium] Error messages should guide the next action
- Location: API request handling
- Evidence from diff: GitHub API failures are handled at the server boundary and returned to the UI.
- Problem: If a GitHub request fails, a generic error message does not tell the user whether the repository URL is wrong, the PR number is invalid, or the token lacks permission.
- Why it matters: Beginner developers often use the error message as their debugging map. A vague message makes the product feel broken even when the fix is simple.
- When it fails: A user enters a private repository URL with a token that lacks access and receives a message that does not mention permissions.
- Suggested fix: Branch on common HTTP status codes and return actionable messages.
- Suggested test: Mock GitHub 401, 403, and 404 responses and assert that each one produces a different user-facing message.
- Confidence: High
- Example code:
\`\`\`ts
if (!response.ok) {
  if (response.status === 404) {
    throw new Error("Repository or pull request was not found. Check the URL and PR number.");
  }

  if (response.status === 401) {
    throw new Error("GitHub token is missing or does not have enough permission.");
  }

  throw new Error("GitHub API request failed.");
}
\`\`\`

### 2. [Severity: Low] Long diffs need token-aware truncation
- Location: Diff preparation
- Evidence from diff: File patches are collected and converted into a single model prompt.
- Problem: Sending every changed line from a large PR can make the review slow or expensive.
- Why it matters: AI APIs have input limits, and users will trust the tool more if it clearly explains when input was shortened.
- When it fails: A PR includes generated files, lockfiles, or a large formatting-only change that consumes most of the model context.
- Suggested fix: Limit each file patch and the total diff budget, then mark truncated content.
- Suggested test: Add a fixture with many changed files and verify the final diff stays below the configured character budget.
- Confidence: High
- Example code:
\`\`\`ts
function truncateDiff(diff: string, maxLength = 7000) {
  if (diff.length <= maxLength) {
    return diff;
  }

  return diff.slice(0, maxLength) + "\\n[Diff truncated]";
}
\`\`\`

### 3. [Severity: Low] A learning section makes the tool more memorable
- Location: Review output format
- Evidence from diff: The product returns Markdown that can include structured teaching sections.
- Problem: A normal review tells the author what to change, but a mentor-style review should also teach the underlying idea.
- Why it matters: This is the product's strongest differentiator versus generic AI review bots.
- When it fails: The output lists issues but does not help a junior developer understand the pattern behind them.
- Suggested fix: Add a short "Learning Notes" section after the issues.
- Suggested test: Snapshot-test demo output and prompt output requirements so the section is not accidentally removed.
- Confidence: Medium
- Example code:
\`\`\`ts
const prompt = createReviewPrompt({
  diff,
  options: { audience: "beginner", focus: "testing", language: "ko", style: "mentor" }
});
\`\`\`

## Test Plan Suggestions
- Unit tests: repository URL parsing, review option normalization, diff truncation.
- Integration or E2E tests: API returns demo review without keys, then returns real metadata when keys are present and GitHub is mocked.
- Manual checks: small PR, large PR, private repository, binary file change, invalid PR number.

## Learning Notes
- Severity labels help readers decide what to fix first.
- A good review explains both the change and the reason behind the change.

## Final Summary
- Top priority: keep reviews grounded in the diff and provide actionable tests for every meaningful issue.
- Safe to merge when: API failures, large diffs, and empty/binary patches are handled predictably.
`.trim();
}
