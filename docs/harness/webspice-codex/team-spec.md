# WebSpice Codex Parallel Harness

## Goal

Define a portable, repo-local harness for running Claude Code and Codex in
parallel on WebSpice without hiding coordination rules in ad hoc prompts.

This harness covers task routing, Codex brief generation, worktree-based Codex
execution, PR review, and final integration validation. It does not replace the
existing `.claude/` roles; it makes their handoffs explicit and durable.

## Source Inputs

- `AGENTS.md`: repo-wide coding and validation rules.
- `docs/CODEX_HARNESS_GUIDE.md`: current Claude/Codex operating policy.
- `docs/TASK_BREAKDOWN.md`: task inventory, dependencies, and phase context.
- `.claude/skills/spice-feature/SKILL.md`: existing Claude orchestration flow.
- `.claude/skills/codex-delegate/SKILL.md`: existing Codex brief generator.
- `.claude/agents/feature-architect.md`: task routing criteria.
- `.claude/agents/qa-validator.md`: integration validation criteria.

## Architecture Pattern

Primary pattern: Expert Pool + Producer-Reviewer.

- Expert Pool: route each request to Claude Code, Codex, or both using explicit
  task-fit criteria.
- Producer-Reviewer: Codex produces an isolated PR; Claude Code or the user
  reviews it against the brief and integration checks.

Secondary pattern: Pipeline for multi-agent feature delivery.

1. Analyze and route the task.
2. Generate deterministic Codex briefs.
3. Run Claude Code and Codex tracks in parallel where safe.
4. Review Codex PRs against their briefs.
5. Merge and run integration QA.

## Roles

| Role                | Responsibility                                            | Canonical source                         | Writes                                         |
| ------------------- | --------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| Feature Architect   | Split user requests into Claude and Codex tracks          | `.claude/agents/feature-architect.md`    | `_workspace/plan.md`                           |
| Codex Brief Author  | Convert Codex-fit tasks into executable briefs            | `.claude/skills/codex-delegate/SKILL.md` | `_workspace/codex-briefs/{task-id}-brief.md`   |
| Codex Implementer   | Implement exactly one brief in an isolated worktree       | `AGENTS.md` plus brief                   | PR branch                                      |
| Claude Engine Coder | Own complex engine, solver, parser, and analysis work     | `.claude/agents/engine-coder.md`         | source, tests, `_workspace/engine-complete.md` |
| Claude UI Coder     | Own complex Canvas, Redux, and React interaction work     | `.claude/agents/ui-coder.md`             | source, tests, `_workspace/ui-complete.md`     |
| QA Validator        | Check cross-boundary consistency and CI commands          | `.claude/agents/qa-validator.md`         | `_workspace/qa-report.md`                      |
| Integrator          | Review Codex PRs, resolve conflicts, run final validation | this spec                                | merge decision and integration notes           |

## Routing Rules

Send a task to Codex only when all four checks pass:

- Pattern exists: a nearly identical local implementation can be named.
- Independence holds: the task does not touch files Claude is actively editing.
- Specification is complete: inputs, outputs, interfaces, and changed files can
  be listed before implementation starts.
- Automatic validation exists: `npm run test`, `npm run type-check`, or a
  narrower command can decide pass or fail.

Keep the task on the Claude track when any check fails, especially for:

- AC, transient, or nonlinear numerical algorithms.
- Cross-layer state shape changes from engine to store to UI.
- Canvas interaction systems where event state and Redux state evolve together.
- Shared type migrations that affect both Codex and Claude tracks.

## Safe Codex Task Classes

- Component models that follow `src/engine/components/resistor.ts`,
  `dcVoltageSource.ts`, or `dcCurrentSource.ts`.
- Parser extensions with fully stated JSON shapes and expected errors.
- Test fixtures, examples, and factory helpers.
- Standalone UI panels or charts with fixed props and existing visual patterns.
- Reducer additions that do not require new engine output semantics.

## Unsafe or Claude-Owned Task Classes

- `src/engine/analysis/*` algorithms with new numerical behavior.
- `src/engine/solver/*` changes that affect matrix stability or convergence.
- `src/components/circuit/CircuitCanvas.tsx` when wire, selection, drag, and
  simulation state interact.
- Shared type changes in `src/types/*` until Claude has landed the contract.
- Any task requiring exploratory product decisions.

## Phase Order

### Phase 1: Request Intake

- Input sources: user request, `docs/TASK_BREAKDOWN.md`, `docs/PRD.md`.
- Actions: identify phase, dependencies, shared type needs, and validation
  surface.
- Output file: `_workspace/00_input/request-summary.md`.
- Completion criteria: request is mapped to one or more task IDs or a clearly
  scoped custom task.

### Phase 2: Routing Plan

- Input sources: request summary, local code patterns, active work list.
- Actions: apply the four Codex-fit checks and divide Claude/Codex tracks.
- Output file: `_workspace/plan.md`.
- Completion criteria: every subtask has an owner, forbidden overlap list, and
  validation command.

### Phase 3: Codex Brief Generation

- Input sources: `_workspace/plan.md`, local pattern files, this spec.
- Actions: generate one brief per Codex task using
  `docs/harness/webspice-codex/codex-brief-template.md`.
- Output files: `_workspace/codex-briefs/{task-id}-brief.md`.
- Completion criteria: each brief names exact files, interfaces, tests,
  forbidden files, and completion commands.

### Phase 4: Parallel Implementation

- Input sources: Claude plan, Codex briefs.
- Actions:
  - Claude implements high-context or shared-contract work locally.
  - Codex implements one brief per isolated worktree and opens a PR.
- Output files:
  - `_workspace/engine-complete.md` or `_workspace/ui-complete.md`.
  - Codex PRs with validation notes.
- Completion criteria: each track reports changed files and commands run.

### Phase 5: Review and Integration

- Input sources: Codex PR diff, original brief, Claude changes, QA report.
- Actions: review PR compliance, resolve conflicts, merge only after the shared
  contract is stable.
- Output file: `_workspace/reviews/{task-id}-codex-review.md`.
- Completion criteria: PR is accepted, fixed, or rejected with reason.

### Phase 6: Final QA

- Input sources: merged work, QA checklist, package scripts.
- Actions: run boundary review, then validation commands.
- Output file: `_workspace/qa-report.md`.
- Completion criteria: `npm run ci:quick` passes for normal changes; use
  `npm run ci` before release or larger integration merges.

## Handoff Files

| From                | To                  | File                                           | Purpose                                 |
| ------------------- | ------------------- | ---------------------------------------------- | --------------------------------------- |
| User / Orchestrator | Feature Architect   | `_workspace/00_input/request-summary.md`       | Preserve task scope and assumptions     |
| Feature Architect   | Codex Brief Author  | `_workspace/plan.md`                           | Declare routing and overlap constraints |
| Codex Brief Author  | Codex Implementer   | `_workspace/codex-briefs/{task-id}-brief.md`   | Exact implementation contract           |
| Codex Implementer   | Integrator          | PR description                                 | Report files changed and validation run |
| Integrator          | QA Validator        | `_workspace/reviews/{task-id}-codex-review.md` | Capture brief compliance and risks      |
| QA Validator        | User / Orchestrator | `_workspace/qa-report.md`                      | Final integration evidence              |

## Codex Brief Requirements

Every Codex brief must include:

- one task only
- exact pattern files to read first
- exact created and modified files
- TypeScript interfaces or function signatures when public shapes change
- explicit differences from the pattern
- required tests, including edge and error cases
- forbidden files and active Claude-owned surfaces
- completion commands
- PR description checklist

Codex prompts should use this form:

```text
Read AGENTS.md and _workspace/codex-briefs/{task-id}-brief.md.
Implement only the brief. Run every command in the completion criteria.
Open a PR with the changed files, tests run, and any deviations from the brief.
```

## Conflict Policy

- Shared type changes in `src/types/*` land before Codex work starts.
- If Codex needs a forbidden file, it stops and reports the missing contract
  instead of editing around the constraint.
- If Claude and Codex both need the same file, split the task again or serialize
  the work; do not rely on merge conflict resolution as coordination.
- If Codex discovers the brief is incomplete, update the brief and rerun the
  task rather than accepting speculative implementation.

## Review Policy

Review Codex PRs in this order:

1. Compare changed files against the brief.
2. Check public interfaces and parser shapes against the brief.
3. Run or confirm the listed validation commands.
4. Inspect tests for the required normal, edge, and error cases.
5. Check for unrelated refactors or broad cleanup.
6. Run integration validation after merge.

Accepted outcomes:

- `pass`: mergeable after CI.
- `fix`: bounded changes needed, same brief still valid.
- `redo`: brief or implementation is materially wrong.
- `reject`: task was not Codex-fit or conflicts with Claude-owned work.

## Validation Commands

Default commands:

```bash
npm run type-check
npm run lint
npm run test
```

Fast pre-merge command:

```bash
npm run ci:quick
```

Full release or major integration command:

```bash
npm run ci
```

Use narrower Vitest commands inside Codex briefs when the task is isolated, but
keep `npm run type-check` and `npm run lint` unless there is a documented reason
not to.

## Minimal File Layout

```text
docs/harness/webspice-codex/
├── team-spec.md
└── codex-brief-template.md

_workspace/
├── 00_input/
│   └── request-summary.md
├── plan.md
├── codex-briefs/
│   └── {task-id}-brief.md
├── reviews/
│   └── {task-id}-codex-review.md
└── qa-report.md
```

## Normal Flow Scenario

Request: implement capacitor and inductor models while Claude works on AC
analysis.

Expected routing:

- Claude owns shared AC analysis contracts and `src/engine/analysis/*`.
- Codex gets one brief for capacitor and one brief for inductor only after
  shared type contracts are stable.
- Each Codex brief names pattern files, parser updates, tests, and forbidden
  AC analysis files.
- Integrator reviews both PRs against their briefs before merging.
- QA runs `npm run ci:quick` after integration.

## Failure Flow Scenario

Failure: Codex PR modifies `src/engine/analysis/acAnalysis.ts` even though the
brief forbids it.

Expected behavior:

- Mark review outcome as `redo` or `reject`.
- Do not merge the PR.
- Update the brief if the forbidden file was actually required.
- Otherwise rerun Codex with the original forbidden-file constraint.

## Removable Model-Specific Logic

The following guidance is intentionally removable as Codex behavior improves:

- repeat "implement only the brief" in the prompt
- require exact file lists in every brief
- require pattern-file callouts for simple fixture-only work

Deletion trigger: remove or simplify these rules only after at least three
consecutive Codex PRs pass review without scope drift or missing validation.
