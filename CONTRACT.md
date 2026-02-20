# CRO Job Contract

This document defines how **jobs** are represented and exchanged between the GitHub App (producer) and the Cursor Extension (consumer). The job queue is implemented as GitHub Issues in the same repository where the command was issued.

---

## 1. Where the job lives

| Aspect | Value |
|--------|--------|
| **Resource** | A GitHub **Issue** in the same repository as the source comment. |
| **Label** | `cro-job` (required). The Extension filters with `GET /repos/{owner}/{repo}/issues?labels=cro-job&state=open`. |
| **State** | **open** = pending or in progress; **closed** = processed (success or failure). |
| **Optional status labels** | `cro-pending`, `cro-running`, `cro-completed`, `cro-failed` for finer status without relying only on open/closed. |

---

## 2. Who creates the job

The **GitHub App** creates the job when it receives an `issue_comment` (or future `workflow_dispatch`) event, after validating:

- The comment matches a supported command (e.g. starts with `/cursor` or a configured prefix).
- The comment author is in the repository’s allow list (e.g. `.github/cro-allowed-users.yml`).

---

## 3. Job payload (issue body)

The **entire issue body** is a single JSON object. This allows trivial parsing and evolution via a `version` field.

### 3.1 Schema (current version: 1)

```json
{
  "version": 1,
  "jobId": "uuid-v4-or-opaque-id",
  "createdAt": "2026-02-19T12:00:00Z",
  "source": {
    "type": "issue_comment",
    "repo": { "owner": "org", "name": "repo" },
    "issueNumber": 42,
    "commentId": 123456789,
    "commentBody": "/cursor fix this",
    "requestedBy": "github-username"
  },
  "payload": {
    "command": "fix this",
    "prompt": "fix this",
    "baseBranch": "main"
  },
  "status": "pending"
}
```

### 3.2 Field reference

| Field | Required | Set by | Description |
|-------|----------|--------|-------------|
| `version` | Yes | App | Contract version; increment on breaking changes. |
| `jobId` | Yes | App | Unique id (e.g. UUID); used for idempotency and id in logs. |
| `createdAt` | Yes | App | ISO 8601 UTC timestamp when the job was created. |
| `source` | Yes | App | Identifies the originating event and where to report back. |
| `source.type` | Yes | App | Event type, e.g. `issue_comment` (future: `workflow_dispatch`). |
| `source.repo` | Yes | App | Repository: `owner` and `name` (for GitHub API calls). |
| `source.issueNumber` | Yes | App | Issue or PR number (PRs are issues in the API). |
| `source.commentId` | No | App | Comment id if replying to the specific comment is needed. |
| `source.commentBody` | No | App | Raw comment text for audit. |
| `source.requestedBy` | Yes | App | GitHub login of the user who requested the command. |
| `payload` | Yes | App | Data the Extension uses to execute the job. |
| `payload.command` | Yes | App | Text after the slash command (e.g. `fix this`). |
| `payload.prompt` | Yes | App | Text sent to the Cursor agent (may equal `command` or be derived). |
| `payload.baseBranch` | Yes | App | Base branch for the dedicated branch (e.g. `main`, `develop`). |
| `payload.branchName` | No | App | Optional override for the branch name (e.g. `cro/issue-42`). |
| `status` | Yes | App / Extension | One of: `pending`, `running`, `completed`, `failed`. |

### 3.3 Status lifecycle

- **App** creates the issue with `status: "pending"` and label `cro-job` (and optionally `cro-pending`).
- **Extension** when it picks up the job: sets `status: "running"` (and optionally label `cro-running`).
- **Extension** when it finishes: sets `status: "completed"` or `status: "failed"`, adds the corresponding label, and **closes the job issue**.

---

## 4. Branch and PR rules

| Aspect | Rule |
|--------|------|
| **Branch name** | Default: `cro/issue-{source.issueNumber}` (e.g. `cro/issue-42`). Optional override: `payload.branchName`. |
| **Base branch** | Always `payload.baseBranch`. |
| **PR** | Extension creates a PR: head = dedicated branch, base = `payload.baseBranch`. The user merges the PR themselves. |
| **PR title/body** | Should reference the source issue (e.g. “CRO: from #42”). |

---

## 5. Feedback to the user

Status updates are posted as **comments on the source issue/PR** (the one the user commented on), not only on the job issue:

- **Started:** e.g. “CRO: Execution started.”
- **Finished:** e.g. “CRO: Completed. PR #99 opened.”
- **Failed:** e.g. “CRO: Failed. &lt;reason&gt;.”

The Extension uses `source.repo` and `source.issueNumber` to call the GitHub API and post these comments.

---

## 6. Idempotency

- The Extension should only process jobs with `status === "pending"`.
- Before starting work, the Extension should set `status` to `"running"` (e.g. via PATCH on the job issue body) so another client or retry does not process the same job again.
- `jobId` is the canonical unique identifier for logging and deduplication.

---

## 7. TypeScript types

The same contract is implemented as TypeScript types and helpers in `packages/shared`. Use that package in both the GitHub App and the Extension to keep parsing and validation consistent.
