/**
 * CRO Job Contract – shared types and helpers for the job queue (GitHub Issues).
 * @see CONTRACT.md at repo root for full specification.
 */

/** Supported contract schema version. */
export const JOB_CONTRACT_VERSION = 1;

/** Valid values for job status. */
export type JobStatus = "pending" | "running" | "completed" | "failed";

/** Source event type that created the job. */
export type JobSourceType = "issue_comment" | "workflow_dispatch";

/** Repository identifier for API calls. */
export interface JobSourceRepo {
  owner: string;
  name: string;
}

/** Origin of the job (where the command was issued and where to report back). */
export interface JobSource {
  type: JobSourceType;
  repo: JobSourceRepo;
  issueNumber: number;
  commentId?: number;
  commentBody?: string;
  requestedBy: string;
}

/** Payload executed by the Extension (command and git context). */
export interface JobPayload {
  command: string;
  prompt: string;
  baseBranch: string;
  branchName?: string;
}

/** Full job document stored in the GitHub Issue body (JSON). */
export interface CroJob {
  version: number;
  jobId: string;
  createdAt: string;
  source: JobSource;
  payload: JobPayload;
  status: JobStatus;
}

/** Label applied to job issues so the Extension can filter them. */
export const JOB_LABEL = "cro-job";

/** Optional status labels for finer-grained filtering. */
export const STATUS_LABELS: Record<JobStatus, string> = {
  pending: "cro-pending",
  running: "cro-running",
  completed: "cro-completed",
  failed: "cro-failed",
};

/**
 * Parses and validates the job from an issue body.
 * @param body - Raw issue body (JSON string).
 * @returns The parsed job or null if invalid.
 */
export function parseJobBody(body: string | null | undefined): CroJob | null {
  if (body == null || body.trim() === "") return null;
  let data: unknown;
  try {
    data = JSON.parse(body) as unknown;
  } catch {
    return null;
  }
  return validateJob(data);
}

/**
 * Type guard and validator for a plain object as CroJob (version 1).
 */
export function validateJob(data: unknown): CroJob | null {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;
  const version = o.version;
  if (version !== JOB_CONTRACT_VERSION) return null;

  const jobId = o.jobId;
  if (typeof jobId !== "string" || jobId === "") return null;

  const createdAt = o.createdAt;
  if (typeof createdAt !== "string" || createdAt === "") return null;

  const source = o.source;
  if (source == null || typeof source !== "object" || Array.isArray(source)) return null;
  const s = source as Record<string, unknown>;
  const repo = s.repo;
  if (repo == null || typeof repo !== "object" || Array.isArray(repo)) return null;
  const r = repo as Record<string, unknown>;
  if (typeof r.owner !== "string" || typeof r.name !== "string") return null;
  if (typeof s.issueNumber !== "number") return null;
  if (typeof s.requestedBy !== "string" || s.requestedBy === "") return null;

  const payload = o.payload;
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.command !== "string" || typeof p.prompt !== "string" || typeof p.baseBranch !== "string") return null;

  const status = o.status;
  if (status !== "pending" && status !== "running" && status !== "completed" && status !== "failed") return null;

  return {
    version: JOB_CONTRACT_VERSION,
    jobId,
    createdAt,
    source: {
      type: (s.type as JobSourceType) ?? "issue_comment",
      repo: { owner: r.owner as string, name: r.name as string },
      issueNumber: s.issueNumber as number,
      commentId: typeof s.commentId === "number" ? s.commentId : undefined,
      commentBody: typeof s.commentBody === "string" ? s.commentBody : undefined,
      requestedBy: s.requestedBy as string,
    },
    payload: {
      command: p.command as string,
      prompt: p.prompt as string,
      baseBranch: p.baseBranch as string,
      branchName: typeof p.branchName === "string" ? p.branchName : undefined,
    },
    status: status as JobStatus,
  };
}

/**
 * Derives the dedicated branch name for a job (default pattern).
 */
export function getJobBranchName(job: CroJob): string {
  if (job.payload.branchName != null && job.payload.branchName !== "") {
    return job.payload.branchName;
  }
  return `cro/issue-${job.source.issueNumber}`;
}
