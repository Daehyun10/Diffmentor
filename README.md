# DiffMentor

[English](README.md) | [한국어](README.ko.md)

Beginner-friendly AI Pull Request mentor for GitHub. DiffMentor reviews PR diffs and returns Markdown with severity labels, clear reasoning, fix suggestions, example code, test ideas, confidence, and learning notes.

> DiffMentor is not just "AI found problems." It explains code review like a friendly senior developer so the author can learn while fixing the PR.

![DiffMentor demo](docs/demo.svg)

## Features

- Web UI built with Next.js and Tailwind CSS
- Server-only API key handling through Next.js API Routes
- GitHub Pull Request diff fetching with the REST API
- OpenAI-powered Markdown reviews
- Demo mode when API keys are missing
- Review profiles: beginner, intermediate, senior
- Review focus: general, security, performance, frontend, testing
- Output language: Korean or English
- Review style: mentor, checklist, strict
- CLI support
- GitHub Actions integration that comments on PRs automatically
- Token-aware diff truncation

## How It Works

1. The user enters a GitHub repository URL and Pull Request number.
2. The server parses the URL into `owner/repo`.
3. The server calls the GitHub REST API to fetch changed PR files.
4. Each file patch is converted into a review input.
5. Long file patches and very large PRs are truncated before being sent to the model.
6. The review profile is applied: audience, focus, language, and style.
7. OpenAI generates a Markdown review with risk level, findings, suggested fixes, tests, and learning notes.
8. The web app renders the Markdown. The CLI prints it. GitHub Actions can post it as a PR comment.

API keys are used only in the server/API process, CLI process, or GitHub Actions runner. The browser never receives `OPENAI_API_KEY` or `GITHUB_TOKEN`.

## Review Quality Standard

DiffMentor is prompted to behave like a principal-level reviewer, not a generic chatbot.

- stays grounded in the provided diff
- avoids inventing issues when context is missing
- separates blocking issues from ordinary suggestions
- assigns severity using production impact
- explains why each issue matters
- describes when the issue fails in practice
- suggests a concrete fix
- suggests a concrete test
- includes confidence for each finding
- teaches one or two reusable concepts for beginners

## Tech Stack

- Frontend: Next.js, React, TypeScript
- Styling: Tailwind CSS
- Backend: Next.js API Route
- GitHub API: REST API
- AI API: OpenAI API
- CLI: Node.js
- Markdown rendering: react-markdown

## Installation

```bash
git clone https://github.com/Daehyun10/Diffmentor.git
cd Diffmentor
npm install
```

## Environment Variables

Create `.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key_here
GITHUB_TOKEN=your_github_personal_access_token_here
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_MODEL` is optional. If keys are missing, the app runs in demo mode.

## Run the Web App

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Demo deep link:

```txt
http://localhost:3000/?demo=1
```

## Use the CLI

Demo mode without external API calls:

```bash
npm run cli -- --repo vercel/next.js --pr 123 --demo
```

Review a real PR:

```bash
OPENAI_API_KEY=your_key GITHUB_TOKEN=your_token npm run cli -- --repo vercel/next.js --pr 123
```

Review a local diff file:

```bash
npm run cli -- --repo your-name/your-repo --pr 1 --diff-file changes.diff
```

Post the review as a PR comment:

```bash
npm run cli -- --repo your-name/your-repo --pr 12 --post-comment
```

Useful options:

```bash
--audience beginner|intermediate|senior
--focus general|security|performance|frontend|testing
--language ko|en
--style mentor|checklist|strict
--output review.md
--quiet
```

## GitHub Actions

Add this workflow to another repository:

```yaml
name: DiffMentor

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: read
  issues: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Daehyun10/Diffmentor@main
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        with:
          audience: beginner
          focus: general
          language: ko
          style: mentor
```

## API

`POST /api/review`

```json
{
  "repositoryUrl": "https://github.com/vercel/next.js",
  "pullRequestNumber": 123,
  "options": {
    "audience": "beginner",
    "focus": "security",
    "language": "ko",
    "style": "mentor"
  }
}
```

## Why This Can Stand Out

Most AI review tools are optimized for finding issues. DiffMentor is optimized for teaching the developer during review.

- beginner-first explanations
- concrete failure scenarios and impact
- fix examples and test suggestions
- Web, CLI, and GitHub Actions support
- security, performance, frontend, and testing-focused modes
- Markdown output that works across web, terminal, and PR comments

## Roadmap

- Inline file-level PR review comments
- review caching to reduce OpenAI cost
- custom team review rules in `diffmentor.config.json`
- severity filters in the UI
- repository history awareness
- support for GitLab and Bitbucket
- SARIF export for code scanning tools
- multiple model providers

## License

MIT
