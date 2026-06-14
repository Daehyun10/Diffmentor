import type { ReviewOptions } from "@/lib/reviewOptions";

export function createReviewPrompt(params: {
  owner: string;
  repo: string;
  pullRequestNumber: number;
  diff: string;
  options: ReviewOptions;
}): string {
  const outputLanguage = params.options.language === "ko" ? "Korean" : "English";
  const audienceGuidance = {
    beginner: "Explain each important idea for a beginner. Define jargon briefly before using it.",
    intermediate: "Assume the reader knows common programming concepts, but explain trade-offs clearly.",
    senior: "Be concise and focus on risk, maintainability, architecture, and missed edge cases."
  }[params.options.audience];
  const focusGuidance = {
    general: "Balance correctness, readability, maintainability, tests, and user impact.",
    security: "Prioritize security issues such as injection, auth, secrets, permissions, unsafe input, and data exposure.",
    performance: "Prioritize unnecessary work, slow algorithms, network usage, rendering cost, caching, and scalability.",
    frontend: "Prioritize accessibility, state handling, responsive UI, error states, and user experience.",
    testing: "Prioritize missing tests, brittle tests, edge cases, mocks, and testability."
  }[params.options.focus];
  const styleGuidance = {
    mentor: "Sound like a patient senior developer mentoring the author.",
    checklist: "Use compact checklists and clear action items.",
    strict: "Be direct and risk-focused, but still respectful."
  }[params.options.style];
  const reviewDepth = [
    "Correctness and edge cases",
    "Security and privacy risk",
    "Performance and scalability",
    "Maintainability and API design",
    "Frontend accessibility and UX regressions",
    "Testing gaps and test quality",
    "Operational risk, observability, and rollout safety"
  ].join(", ");

  return `
You are a principal-level AI Pull Request reviewer and mentor.
Your goal is to produce a review that is useful enough for a real production code review.

Review this GitHub Pull Request:
- Repository: ${params.owner}/${params.repo}
- Pull Request: #${params.pullRequestNumber}

Return the review in ${outputLanguage} Markdown.

Rules:
- Focus only on the provided diff.
- Avoid guessing about code not shown in the diff.
- If context is missing, explicitly say what cannot be verified.
- Do not invent issues. Every issue must be grounded in a changed line, file, or directly implied behavior.
- Prioritize high-signal findings. Avoid style-only comments unless they affect correctness, safety, maintainability, or learning.
- Severity guide: High means likely production bug, security issue, data loss, broken user flow, or serious regression. Medium means realistic bug, missing edge case, brittle design, or meaningful maintenance risk. Low means polish, clarity, test coverage, or small maintainability improvement.
- Include practical fix examples when useful, but keep examples minimal and directly related.
- Prefer specific file/function references when possible.
- Teach the author why each issue matters.
- Review dimensions to consider: ${reviewDepth}.
- ${audienceGuidance}
- ${focusGuidance}
- ${styleGuidance}

Markdown format:

# AI Code Review

## Review Snapshot
- Overall risk: Low|Medium|High
- Release recommendation: Approve|Approve with follow-up|Request changes
- Main reason: one sentence

## What Went Well
- ...

## Blocking Or High-Risk Issues
- If none, write "No blocking issues found in the provided diff."

## Issues And Suggestions

### 1. [Severity: Low|Medium|High] Short title
- Location: file name or code area
- Evidence from diff: quote or paraphrase the exact changed behavior, without long code dumps
- Problem: ...
- Why it matters: ...
- When it fails: concrete scenario or user/developer impact
- Suggested fix: ...
- Suggested test: ...
- Confidence: Low|Medium|High
- Example code:
\`\`\`ts
// example
\`\`\`

## Test Plan Suggestions
- Unit tests:
- Integration or E2E tests:
- Manual checks:

## Learning Notes
- Explain one or two useful concepts a beginner can learn from this PR.

## Final Summary
- Top priority:
- Safe to merge when:

Diff:

${params.diff}
`.trim();
}
