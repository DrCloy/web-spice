# Repository Guidelines

## Project Structure & Module Organization

WebSpice is a Vite, React, and TypeScript circuit simulation app. Source lives
in `src/`: UI in `src/components`, Redux Toolkit state in `src/store`, shared
types in `src/types`, and solver/parser logic in `src/engine`. The CLI entry is
`src/cli/index.ts`. Tests mirror source areas in `tests/`, with shared support
in `tests/factories`, `tests/fixtures`, and `tests/utils`. Example circuits are
in `examples/`, static assets in `public/`.

## Build, Test, and Development Commands

- `npm run dev` starts Vite with host binding for container use.
- `npm run dev:local` starts local Vite.
- `npm run build` runs TypeScript project builds and creates the bundle.
- `npm run preview` serves the built app for inspection.
- `npm run web-spice -- <args>` runs the TypeScript CLI through `tsx`.
- `npm run ci` runs type checking, linting, format checks, tests, and build.
- `npm run ci:quick` runs pre-commit validation without formatting or build.

## Coding Style & Naming Conventions

Use TypeScript and React functional components. Prefer explicit domain names,
`readonly` fields where appropriate, and typed interfaces for public shapes.
Follow existing file names: `CircuitCanvas.tsx` for React components and lower
camel case for modules such as `dcAnalysis.ts` or `simulationSlice.ts`.
Prettier enforces 2 spaces, semicolons, single quotes, 80-column print width,
trailing commas, LF endings, and Tailwind class sorting. Run `npm run lint` and
`npm run format:check`; use `npm run lint:fix` or `npm run format` to fix.

## Testing Guidelines

Vitest is the test framework. Name tests `*.test.ts` or `*.test.tsx` and place
them under the matching `tests/` subdirectory, for example
`tests/engine/solver/matrix.test.ts`. Use existing factories and fixtures for
common circuits. Run `npm run test` for one pass, `npm run test:watch` for TDD,
`npm run test:coverage` before larger changes, and `npm run test:bench` when
performance fixtures are relevant.

## Commit & Pull Request Guidelines

Commits use Conventional Commits enforced by commitlint, such as
`feat: add dc sweep parser`, `fix: handle singular matrix errors`, or
`test: strengthen symbol renderer coverage`. Allowed types include `feat`,
`fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and
`revert`; keep subjects 10-100 characters with no trailing period. PRs should
describe the change, link issues with `Closes #123` when applicable, include
screenshots for UI changes, and note validation commands run.

Every commit you create must include the following co-author trailer:

```
Co-Authored-By: OpenAI Codex <noreply@openai.com>
```

Example commit message:

```
feat: add capacitor component model

Co-Authored-By: OpenAI Codex <noreply@openai.com>
```

## Parallel Workflow with Claude Code

This project runs Claude Code (Sonnet 4.6) and Codex (GPT-5.5) in parallel.
Claude Code owns orchestration, routing, and complex cross-layer work. Codex
implements isolated, well-specified tasks delivered as briefs.

**When you receive a task:**

1. Read `_workspace/codex-briefs/{task-id}-brief.md` for the full specification.
2. Implement only what the brief specifies. Do not refactor, clean up, or expand scope.
3. Do not edit files listed under "Forbidden Files" in the brief. If a forbidden
   file appears necessary, stop and report the missing contract in the PR.
4. Run every command listed under "Completion Criteria" before opening a PR.
5. Open a PR. Include: changed files, commands run and their output, any
   deviation from the brief, and confirmation that forbidden files were untouched.

**Files Claude Code actively owns** (always forbidden unless the brief explicitly permits):

- `src/engine/analysis/` — AC and numerical analysis algorithms
- `src/engine/solver/` — matrix and convergence logic
- `src/components/circuit/CircuitCanvas.tsx` — wire and interaction state
- `src/types/` — shared type contracts (until Claude lands the change)

## Reviewing Claude Code PRs

When asked to review a Claude Code PR:

1. Run `gh pr diff {number}` to read the full diff.
2. Check against `docs/harness/webspice-codex/team-spec.md` review policy.
3. Verify the implementation matches the stated goal and does not break
   existing patterns in the files it touches.
4. Leave a review comment with one of: `pass`, `fix: {specific issue}`,
   `redo: {reason}`, or `reject: {reason}`.

Focus on: correctness, numerical stability for engine code, Redux pattern
consistency for UI code, test coverage for edge cases.

## Security & Configuration Tips

Do not commit `dist/`, `coverage/`, or local caches. Keep example circuits
small, and document new runtime assumptions in `docs/` or an ADR when they
affect simulation behavior.
