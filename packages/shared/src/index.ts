/**
 * @cro/shared – CRO job contract types and utilities.
 */

export {
  JOB_CONTRACT_VERSION,
  JOB_LABEL,
  STATUS_LABELS,
  getJobBranchName,
  parseJobBody,
  validateJob,
} from "./job-contract.js";
export type {
  CroJob,
  JobPayload,
  JobSource,
  JobSourceRepo,
  JobSourceType,
  JobStatus,
} from "./job-contract.js";
