export const REPORT_REASONS = [
  "Misleading price",
  "Suspicious listing",
  "Potential scam",
  "Inappropriate content",
  "Incorrect product information",
  "Other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

const REASON_LABELS: Record<string, string> = {
  "Misleading price": "Misleading price",
  "Suspicious listing": "Suspicious listing",
  "Potential scam": "Potential scam",
  "Inappropriate content": "Inappropriate content",
  "Incorrect product information": "Incorrect product information",
  Other: "Other",
  scam: "Suspected scam",
  misleading: "Misleading listing",
  prohibited: "Prohibited product",
  harassment: "Harassment or abuse",
  spam: "Spam",
};

export function reportReasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}
