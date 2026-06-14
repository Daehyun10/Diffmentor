export type ReviewAudience = "beginner" | "intermediate" | "senior";
export type ReviewFocus = "general" | "security" | "performance" | "frontend" | "testing";
export type ReviewLanguage = "ko" | "en";
export type ReviewStyle = "mentor" | "checklist" | "strict";

export type ReviewOptions = {
  audience: ReviewAudience;
  focus: ReviewFocus;
  language: ReviewLanguage;
  style: ReviewStyle;
};

export const DEFAULT_REVIEW_OPTIONS: ReviewOptions = {
  audience: "beginner",
  focus: "general",
  language: "ko",
  style: "mentor"
};

export function normalizeReviewOptions(input: Partial<ReviewOptions> = {}): ReviewOptions {
  return {
    audience: isReviewAudience(input.audience) ? input.audience : DEFAULT_REVIEW_OPTIONS.audience,
    focus: isReviewFocus(input.focus) ? input.focus : DEFAULT_REVIEW_OPTIONS.focus,
    language: isReviewLanguage(input.language) ? input.language : DEFAULT_REVIEW_OPTIONS.language,
    style: isReviewStyle(input.style) ? input.style : DEFAULT_REVIEW_OPTIONS.style
  };
}

function isReviewAudience(value: unknown): value is ReviewAudience {
  return value === "beginner" || value === "intermediate" || value === "senior";
}

function isReviewFocus(value: unknown): value is ReviewFocus {
  return value === "general" || value === "security" || value === "performance" || value === "frontend" || value === "testing";
}

function isReviewLanguage(value: unknown): value is ReviewLanguage {
  return value === "ko" || value === "en";
}

function isReviewStyle(value: unknown): value is ReviewStyle {
  return value === "mentor" || value === "checklist" || value === "strict";
}
