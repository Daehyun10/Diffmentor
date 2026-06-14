#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "ai-code-reviewer.mjs");

const eventPath = process.env.GITHUB_EVENT_PATH;
const event = eventPath && fs.existsSync(eventPath)
  ? JSON.parse(fs.readFileSync(eventPath, "utf8"))
  : {};

const pullRequestNumber = event.pull_request?.number ?? event.number ?? process.env.PR_NUMBER;
const repository = process.env.GITHUB_REPOSITORY;

if (!repository || !pullRequestNumber) {
  console.error("This action must run in a pull_request event or provide GITHUB_REPOSITORY and PR_NUMBER.");
  process.exit(1);
}

const args = [
  cliPath,
  "--repo",
  repository,
  "--pr",
  String(pullRequestNumber),
  "--post-comment",
  "--quiet",
  "--audience",
  process.env.INPUT_AUDIENCE || "beginner",
  "--focus",
  process.env.INPUT_FOCUS || "general",
  "--language",
  process.env.INPUT_LANGUAGE || "ko",
  "--style",
  process.env.INPUT_STYLE || "mentor"
];

const result = spawnSync(process.execPath, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
