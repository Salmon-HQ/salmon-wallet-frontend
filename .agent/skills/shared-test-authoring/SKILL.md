---
name: shared-test-authoring
description: "Write or update tests for code in packages/shared: hooks, API services, utilities, blockchain logic, crypto, or config. Use this skill when a task adds test coverage, changes behavior in @salmon/shared, audits missing coverage, or needs repo-specific Vitest and mocking patterns. Use together with salmon-repo-rules when the change also affects ownership, public contracts, or shared-vs-app boundaries."
---

Tests in `packages/shared` protect cross-platform logic that both apps depend on. A bug in a shared hook or service affects mobile and the extension simultaneously. This skill ensures tests follow established vitest patterns and cover the right risks.

## Workflow

1. Read `salmon-repo-rules` first if the change also affects a shared contract, export path, or package boundary.
2. Identify the changed module category: hook, service, util, blockchain, crypto, or config.
3. Check whether a co-located test already exists and extend it before creating a new file.
4. Read [references/test-patterns.md](references/test-patterns.md).
5. Write behavior-focused tests for success paths, failure paths, caching, and edge cases.
6. Run `pnpm turbo run test --filter=@salmon/shared`.

## Clarification gate

Ask 1-3 focused questions if any of these are unclear:

- What behavior is most important to protect — the happy path, error handling, or caching?
- Does the module depend on external APIs that need mocking, or is it pure logic?
- Is the change to an existing tested module (extend tests) or a new module (create test file)?
- Does the hook need jsdom environment, or is it pure logic that works in node?
- What level of coverage does the user expect — critical paths only, or comprehensive?

## Audit mode

When asked to audit test coverage, check for:

- Shared hooks with no corresponding `.test.ts` file
- Services with no cache behavior tests
- Blockchain modules missing error path coverage
- Test files that mock too broadly (entire modules when only one function is needed)
- Tests that assert implementation details instead of observable behavior
- Missing `beforeEach` cleanup (mock state leaking between tests)

Report findings as a prioritized list: high-risk untested code first.

## Rules

- Tests live co-located with source: `module.test.ts` next to `module.ts`
- Use vitest globals (`describe`, `it`, `expect`, `vi`) — they're enabled in config
- Hook tests need `@vitest-environment jsdom` comment at file top
- Service mocks must be declared BEFORE importing the module under test
- Use `vi.mocked()` to access mock function assertions
- Clear mocks in `beforeEach` with `vi.clearAllMocks()` or `vi.resetAllMocks()`
- Test data goes in constants at file top, organized by domain

## What this skill should produce

- Tests that follow the established patterns for the module category.
- Coverage of success paths, error handling, and caching where applicable.
- An audit report when asked to review existing test coverage.
- Questions first when test scope or critical behavior is unclear.
