export type Role = "APPLICANT" | "OFFICER" | "ADMIN";
export type ApplicationStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "NEEDS_REVIEW";

export type User = { id: string; email: string; role: Role };
export type Tokens = { accessToken: string; refreshToken: string };
export type Application = {
  id: string; applicantId: string; amount: string; term: number; monthlyIncome: string;
  purpose: string; status: ApplicationStatus; score: number | null; decidedAt: string | null; createdAt: string;
};
export type ApplicationPage = { data: Application[]; page: number; limit: number; total: number };
export type ApiError = { error?: { message?: string; code?: string } };
