import OpenAI from "openai";

import { createReviewPrompt } from "@/lib/reviewPrompt";
import type { ReviewOptions } from "@/lib/reviewOptions";

const DEFAULT_MODEL = "gpt-4.1-mini";

export async function generateCodeReview(params: {
  apiKey: string;
  owner: string;
  repo: string;
  pullRequestNumber: number;
  diff: string;
  options: ReviewOptions;
}): Promise<string> {
  const client = new OpenAI({
    apiKey: params.apiKey
  });

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    input: createReviewPrompt(params),
    temperature: 0.2
  });

  const output = response.output_text?.trim();

  if (!output) {
    throw new Error("OpenAI API did not return a review.");
  }

  return output;
}
