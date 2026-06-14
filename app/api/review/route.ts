import { NextResponse } from "next/server";

import { createDemoReview } from "@/lib/demoReview";
import {
  buildDiffForReview,
  fetchPullRequestFiles,
  parseGitHubRepositoryUrl
} from "@/lib/github";
import { generateCodeReview } from "@/lib/openai";
import { normalizeReviewOptions, type ReviewOptions } from "@/lib/reviewOptions";

type ReviewRequestBody = {
  repositoryUrl?: string;
  pullRequestNumber?: number | string;
  options?: Partial<ReviewOptions>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReviewRequestBody;
    const repositoryUrl = body.repositoryUrl ?? "";
    const pullRequestNumber = Number(body.pullRequestNumber);
    const options = normalizeReviewOptions(body.options);

    if (!Number.isInteger(pullRequestNumber) || pullRequestNumber <= 0) {
      return NextResponse.json(
        { error: "Pull Request number must be a positive integer." },
        { status: 400 }
      );
    }

    const repository = parseGitHubRepositoryUrl(repositoryUrl);
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!openAiApiKey || !githubToken) {
      return NextResponse.json({
        review: createDemoReview({
          owner: repository.owner,
          repo: repository.repo,
          pullRequestNumber,
          options
        }),
        metadata: {
          owner: repository.owner,
          repo: repository.repo,
          pullRequestNumber,
          reviewedFileCount: 3,
          demoMode: true,
          options
        }
      });
    }

    const files = await fetchPullRequestFiles(repository, pullRequestNumber, githubToken);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "This Pull Request has no changed files." },
        { status: 400 }
      );
    }

    const diff = buildDiffForReview(files);
    const review = await generateCodeReview({
      apiKey: openAiApiKey,
      owner: repository.owner,
      repo: repository.repo,
      pullRequestNumber,
      diff,
      options
    });

    return NextResponse.json({
      review,
      metadata: {
        owner: repository.owner,
        repo: repository.repo,
        pullRequestNumber,
        reviewedFileCount: files.length,
        demoMode: false,
        options
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
