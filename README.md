# Cursor Remote Orchestrator (CRO)

**Command Cursor AI agents from GitHub.** Trigger refactors, bug fixes, and code reviews via comments on Issues and Pull Requests—execution runs on your local machine.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## The Problem

Developers waste time waiting for AI agents to finish long tasks, or must be at their machine to start simple fixes they spotted on their phone or during a PR review in the browser.

## Solution

CRO is a two-layer system:

1. **GitHub App** — Installed on your repo; captures commands from comments (e.g. `/cursor fix this`) and enqueues jobs.
2. **Cursor Extension** — Runs in Cursor on your machine; polls for jobs, runs the agent, and reports status back to GitHub. When done, it pushes to a dedicated branch and opens a PR for you to merge.

No relay server in the MVP: the extension polls the GitHub API within [rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

---

## Features

| Feature | Description |
|--------|-------------|
| **GitHub App** | Install the app on a repo to create the command bridge. |
| **Commands via Issue/PR** | Use comments like `/cursor fix this` or custom slash commands. |
| **Local execution** | The extension picks up the command and triggers the Cursor agent. |
| **Status feedback** | The agent reports when a task starts and finishes (comments on the issue/PR). |
| **Auto branch + PR** | After execution, the extension commits to a dedicated branch and opens a PR; you choose the base branch and merge when ready. |
| **Per-repo whitelist** | Only users you allow (per repository) can send remote commands. |

---

## Architecture (high level)

```
┌─────────────────┐     comment      ┌──────────────────┐     webhook       ┌─────────────────┐
│  GitHub (Issue  │ ───────────────► │   GitHub App     │ ◄──────────────── │  GitHub Events  │
│  / PR comment)  │                  │   (job queue)    │                   │  (issue_comment)│
└─────────────────┘                  └────────┬─────────┘                   └─────────────────┘
                                             │
                                             │  polling (List issues API)
                                             │  interval ≥ 60s (rate-limit safe)
                                             ▼
┌─────────────────┐                  ┌──────────────────┐
│  GitHub (PR     │ ◄── open PR ──── │  Cursor Extension│
│  from branch)   │    + comment     │  (poll, run      │
└─────────────────┘                  │   agent, push)   │
                                     └──────────────────┘
```

- **Job queue:** Implemented via repository issues (e.g. labeled `cro-job`); the App creates a job issue per command; the extension polls `GET /repos/{owner}/{repo}/issues` (core rate limit, not search).
- **Polling:** Authenticated polling every 60–120 seconds keeps usage well under GitHub’s 5,000 requests/hour (and secondary limits). No relay server required for MVP.
- **Security:** Allowed users are configured per repository (e.g. `.github/cro-allowed-users.yml` or App installation settings). Destructive commands can require confirmation in the extension.

---

## Repository structure (monorepo)

```
cursor-remote-orchestrator/
├── apps/
│   ├── github-app/     # GitHub App (webhooks, job creation, permissions)
│   └── relay/          # (optional, future) WebSocket relay for lower latency
├── packages/
│   ├── shared/         # Job contract types and helpers (@cro/shared)
│   └── extension/      # VS Code / Cursor extension (polling, agent trigger, git push + PR)
├── CONTRACT.md         # Job queue contract (issue body schema, status, branch/PR rules)
├── package.json        # workspace root (pnpm workspaces)
└── LICENSE
```

The **job contract** (how jobs are stored in GitHub Issues) is documented in [CONTRACT.md](CONTRACT.md). TypeScript types and helpers live in `packages/shared` and are used by both the App and the Extension.

---

## Security

- **Who can send commands:** Only users listed in the per-repository allow list (following GitHub’s repository-centric security model).
- **Confirmation:** The extension can require explicit user confirmation before running remote commands, especially for sensitive or destructive actions.
- **Scope:** Commands are tied to a specific repo and branch; the extension can validate that the open workspace matches before executing.

---

## Getting started (planned)

1. Install the **GitHub App** on your repository and configure the allow list.
2. Install the **CRO** extension in Cursor and sign in with GitHub.
3. Comment on an Issue or PR with a supported command (e.g. `/cursor fix this`). The extension will pick it up, run the agent, then push to a branch and open a PR.

*(Setup and contribution instructions will be added as the project is implemented.)*

---

## Development status

**Draft / pre-MVP.** Architecture and PRD are defined; implementation is in progress. Contributions are welcome.

---

## Contributing

Contributions are welcome. Please open an Issue for discussion before large changes, and ensure tests and lint pass. Code style and practices will be documented as the repo grows.

---

## License

[MIT](LICENSE). See [LICENSE](LICENSE) for the full text.
