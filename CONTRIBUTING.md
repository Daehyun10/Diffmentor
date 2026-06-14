# Contributing

Thanks for helping improve AI Code Reviewer.

## Local setup

```bash
npm install
npm run dev
```

Create `.env.local` when you want real API calls:

```env
OPENAI_API_KEY=your_openai_api_key
GITHUB_TOKEN=your_github_token
```

Without keys, the app runs in demo mode.

## Before opening a PR

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Project direction

This project is not trying to be the harshest review bot. It should feel like a helpful senior developer who teaches the author what changed, why it matters, and how to improve it.

Good contributions usually improve one of these areas:

- clearer beginner-friendly explanations
- better diff truncation and cost control
- GitHub Actions reliability
- CLI ergonomics
- review prompt quality
- security and privacy defaults
