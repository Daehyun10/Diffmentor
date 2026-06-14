"use client";

import { FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import type { ReviewOptions } from "@/lib/reviewOptions";

type ReviewResponse = {
  review: string;
  metadata: {
    owner: string;
    repo: string;
    pullRequestNumber: number;
    reviewedFileCount: number;
    demoMode?: boolean;
    options: ReviewOptions;
  };
};

const audienceOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "senior", label: "Senior" }
] as const;

const focusOptions = [
  { value: "general", label: "General" },
  { value: "security", label: "Security" },
  { value: "performance", label: "Performance" },
  { value: "frontend", label: "Frontend" },
  { value: "testing", label: "Testing" }
] as const;

const styleOptions = [
  { value: "mentor", label: "Mentor" },
  { value: "checklist", label: "Checklist" },
  { value: "strict", label: "Strict" }
] as const;

export default function Home() {
  const [repositoryUrl, setRepositoryUrl] = useState("https://github.com/vercel/next.js");
  const [pullRequestNumber, setPullRequestNumber] = useState("123");
  const [options, setOptions] = useState<ReviewOptions>({
    audience: "beginner",
    focus: "general",
    language: "ko",
    style: "mentor"
  });
  const [review, setReview] = useState("");
  const [metadata, setMetadata] = useState<ReviewResponse["metadata"] | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.get("demo") === "1") {
      void generateReview();
    }
    // This is a one-time deep link for screenshots and demos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateReview() {
    setError("");
    setReview("");
    setMetadata(null);
    setCopied(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repositoryUrl,
          pullRequestNumber,
          options
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate review.");
      }

      setReview(data.review);
      setMetadata(data.metadata);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unexpected error.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await generateReview();
  }

  async function handleCopy() {
    if (!review) {
      return;
    }

    await navigator.clipboard.writeText(review);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#17191f]">
      <section className="border-b border-[#d9dee8] bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[440px_1fr] lg:px-8">
          <div className="flex flex-col justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#275cc8]">Beginner-friendly PR mentor</p>
              <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">AI Code Reviewer</h1>
              <p className="mt-3 text-base leading-7 text-[#566273]">
                Review a GitHub Pull Request as Markdown with severity labels, fix examples, and learning notes.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <Metric label="Modes" value="Web CLI Action" />
              <Metric label="Output" value="Markdown" />
              <Metric label="Keys" value="Server only" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 rounded-md border border-[#d9dee8] bg-[#fbfcff] p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[1fr_150px]">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#2c3340]">Repository URL</span>
                <input
                  className="h-11 rounded-md border border-[#c8d0dc] bg-white px-3 text-sm outline-none transition focus:border-[#275cc8] focus:ring-2 focus:ring-[#275cc8]/15"
                  placeholder="https://github.com/vercel/next.js"
                  value={repositoryUrl}
                  onChange={(event) => setRepositoryUrl(event.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#2c3340]">PR Number</span>
                <input
                  className="h-11 rounded-md border border-[#c8d0dc] bg-white px-3 text-sm outline-none transition focus:border-[#275cc8] focus:ring-2 focus:ring-[#275cc8]/15"
                  min="1"
                  placeholder="123"
                  type="number"
                  value={pullRequestNumber}
                  onChange={(event) => setPullRequestNumber(event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Select
                label="Audience"
                value={options.audience}
                options={audienceOptions}
                onChange={(value) => setOptions((current) => ({ ...current, audience: value as ReviewOptions["audience"] }))}
              />
              <Select
                label="Focus"
                value={options.focus}
                options={focusOptions}
                onChange={(value) => setOptions((current) => ({ ...current, focus: value as ReviewOptions["focus"] }))}
              />
              <Select
                label="Style"
                value={options.style}
                options={styleOptions}
                onChange={(value) => setOptions((current) => ({ ...current, style: value as ReviewOptions["style"] }))}
              />
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#2c3340]">Language</span>
                <div className="grid h-11 grid-cols-2 rounded-md border border-[#c8d0dc] bg-white p-1">
                  <button
                    className={`rounded px-3 text-sm font-semibold ${options.language === "ko" ? "bg-[#275cc8] text-white" : "text-[#566273]"}`}
                    onClick={() => setOptions((current) => ({ ...current, language: "ko" }))}
                    type="button"
                  >
                    KO
                  </button>
                  <button
                    className={`rounded px-3 text-sm font-semibold ${options.language === "en" ? "bg-[#275cc8] text-white" : "text-[#566273]"}`}
                    onClick={() => setOptions((current) => ({ ...current, language: "en" }))}
                    type="button"
                  >
                    EN
                  </button>
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-[#687386]">
                Without API keys, the app returns a demo review so you can inspect the full workflow.
              </p>
              <button
                className="h-11 rounded-md bg-[#1f6feb] px-5 text-sm font-semibold text-white transition hover:bg-[#195cc4] disabled:cursor-not-allowed disabled:bg-[#9badc7]"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? "Reviewing..." : "Review PR"}
              </button>
            </div>
          </form>

          {error ? (
            <div className="lg:col-span-2 rounded-md border border-[#f0b8b8] bg-[#fff4f4] px-4 py-3 text-sm text-[#a12424]">
              {error}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-7 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Review Result</h2>
            {metadata ? (
              <p className="mt-1 text-sm text-[#687386]">
                {metadata.owner}/{metadata.repo} #{metadata.pullRequestNumber} · {metadata.reviewedFileCount} files · {metadata.options.audience}/{metadata.options.focus}/{metadata.options.style}
                {metadata.demoMode ? " · Demo mode" : ""}
              </p>
            ) : null}
          </div>

          <button
            className="h-10 rounded-md border border-[#c8d0dc] bg-white px-4 text-sm font-semibold text-[#2c3340] transition hover:bg-[#eef2f7] disabled:cursor-not-allowed disabled:text-[#99a3b0]"
            disabled={!review}
            onClick={handleCopy}
            type="button"
          >
            {copied ? "Copied" : "Copy Markdown"}
          </button>
        </div>

        <article className="min-h-[460px] rounded-md border border-[#d9dee8] bg-white p-5 shadow-sm">
          {metadata?.demoMode ? (
            <div className="mb-5 rounded-md border border-[#f0d28a] bg-[#fff9e8] px-4 py-3 text-sm leading-6 text-[#7a5300]">
              Demo mode is active because OPENAI_API_KEY or GITHUB_TOKEN is missing. Add keys to .env.local for real PR analysis.
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex h-[360px] items-center justify-center text-sm font-medium text-[#687386]">
              Fetching PR diff and generating a mentor-style review...
            </div>
          ) : review ? (
            <div className="markdown-body">
              <ReactMarkdown>{review}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex h-[360px] items-center justify-center text-center text-sm leading-6 text-[#687386]">
              Enter a GitHub repository and PR number, then generate a review.
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d9dee8] bg-[#fbfcff] px-3 py-3">
      <div className="text-xs font-semibold uppercase tracking-normal text-[#687386]">{label}</div>
      <div className="mt-1 font-semibold text-[#242a34]">{value}</div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-[#2c3340]">{label}</span>
      <select
        className="h-11 rounded-md border border-[#c8d0dc] bg-white px-3 text-sm outline-none transition focus:border-[#275cc8] focus:ring-2 focus:ring-[#275cc8]/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
