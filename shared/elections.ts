export interface ElectionRules {
  seats: number;
  maxChoices: number;
  voterAgeDays: number;
  candidateAgeDays: number;
  requireVerifiedEmail: boolean;
  minCommunityVotes: number;
  minReviewers: number;
  reviewApprovalPercent: number;
  probationDays: number;
  termDays: number;
  scenario: string;
}
export interface ElectionResult {
  id: number;
  userId: number;
  username: string;
  displayname: string;
  eligible: boolean;
  votes: number;
  invalidVotes: number;
  modPass: number;
  modFail: number;
  modAbstain: number;
  invalidReviews: number;
  participation: number;
  approvalPercent: number;
  quorumMet: boolean;
  recommended: boolean;
  rank: number;
}
export interface ElectionSummary {
  id: number;
  title: string;
  description: string;
  rules: ElectionRules;
  status:
    | "draft"
    | "nominations"
    | "voting"
    | "review"
    | "completed"
    | "cancelled";
  nominationClosesAt: number;
  votingClosesAt: number;
}
export interface ElectionCandidate {
  id: number;
  userId: number;
  username: string;
  displayname: string;
  status: "invited" | "submitted" | "eligible" | "ineligible" | "withdrawn";
  motivation: string;
  experience: string;
  availability: string;
  scenarioAnswer: string;
  decision: "pending" | "needs_info" | "appointed" | "rejected";
  publicReason: string | null;
  verificationReason: string | null;
  supplement: string | null;
  internalNote: string | null;
  overrideReason: string | null;
  probationEndsAt: number | null;
  termEndsAt: number | null;
  confirmedAt: number | null;
  endedAt: number | null;
  endReason: string | null;
  result: ElectionResult | null;
}
export interface ElectionReview {
  candidateId: number;
  verdict: "pass" | "fail" | "abstain";
  comment: string;
  criteria: { rules: boolean; fairness: boolean; evidence: boolean };
}
export interface ElectionDetail extends ElectionSummary {
  candidates: ElectionCandidate[];
  myBallot: number[];
  myReviews: ElectionReview[];
  canVote: boolean;
  canReview: boolean;
  applicationIssues: string[];
  snapshot: {
    closedAt: number;
    electorate: number;
    panel: number;
    turnout: number;
    candidates: ElectionResult[];
  } | null;
  complaints: {
    id: number;
    userId: number;
    message: string;
    status: string;
    resolution: string | null;
  }[];
  reviewDetail: (ElectionReview & { username: string })[];
  audit: {
    id: number;
    actorId: number | null;
    username: string | null;
    action: string;
    details: unknown;
    createdAt: string;
  }[];
}
export const electionStatus: Record<ElectionSummary["status"], string> = {
  draft: "Bản nháp",
  nominations: "Nhận ứng cử",
  voting: "Đang bỏ phiếu",
  review: "Admin xét bổ nhiệm",
  completed: "Đã công bố",
  cancelled: "Đã hủy",
};
export const candidateStatus: Record<ElectionCandidate["status"], string> = {
  invited: "Chờ đồng ý đề cử",
  submitted: "Chờ kiểm tra hồ sơ",
  eligible: "Đủ điều kiện",
  ineligible: "Chưa đủ điều kiện",
  withdrawn: "Đã rút",
};
export const decisionStatus: Record<ElectionCandidate["decision"], string> = {
  pending: "Chờ quyết định",
  needs_info: "Cần bổ sung",
  appointed: "Đã bổ nhiệm",
  rejected: "Không bổ nhiệm",
};
export const ruleLabels: Record<
  Exclude<keyof ElectionRules, "requireVerifiedEmail" | "scenario">,
  string
> = {
  seats: "Số ghế",
  maxChoices: "Số lựa chọn tối đa",
  voterAgeDays: "Tuổi tài khoản cử tri (ngày)",
  candidateAgeDays: "Tuổi tài khoản ứng viên (ngày)",
  minCommunityVotes: "Phiếu cộng đồng tối thiểu",
  minReviewers: "Số mod đánh giá tối thiểu",
  reviewApprovalPercent: "Tỷ lệ mod đồng ý tối thiểu (%)",
  probationDays: "Thời gian thử việc (ngày)",
  termDays: "Nhiệm kỳ (ngày)",
};
