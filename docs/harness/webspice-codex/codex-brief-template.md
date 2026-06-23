# Codex Brief Template

Use this template for one isolated Codex task. Keep each brief complete enough
that Codex does not need to infer public interfaces, file ownership, or
validation criteria.

````markdown
# Codex Task Brief: {task title} ({task-id})

## Goal

{One sentence describing the implementation outcome.}

## Required Reading

Read these files first:

- `AGENTS.md`
- `{primary pattern file}`
- `{secondary pattern file, if needed}`

## Task Fit

This task is Codex-fit because:

- Pattern exists: `{local file and pattern}`
- Independent surface: `{files are separate from active Claude work}`
- Complete spec: `{interfaces and changed files are listed below}`
- Automatic validation: `{commands decide pass/fail}`

## Existing Pattern To Follow

Pattern source: `{path}`

Reuse:

- `{constructor / reducer / parser / rendering pattern}`
- `{validation or test pattern}`

Differences:

- `{difference from pattern}`
- `{difference from pattern}`

## Create Files

- `{new source file}`
- `{new test file}`

## Modify Files

- `{existing file}`: `{specific change}`

## Forbidden Files

Do not edit:

- `{file currently owned by Claude or out of scope}`

If one of these files appears necessary, stop and report the missing contract.

## Public Interfaces

```typescript
// Include exact exported types, class signatures, function signatures, or props.
```

## Implementation Requirements

- `{requirement}`
- `{requirement}`
- `{requirement}`

## Test Requirements

Add or update tests for:

- normal case: `{case}`
- edge case: `{case}`
- error case: `{case}`

## Completion Criteria

Run these commands and ensure they pass:

```bash
npm run test -- {test file or vitest pattern}
npm run type-check
npm run lint
```

## PR Notes

In the PR description, include:

- changed files
- commands run
- any deviation from this brief
- whether forbidden files were untouched
````
