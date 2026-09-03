/**
 * `react-native` does not parse outside Metro (Flow syntax), and Vitest's
 * Rollup transform chokes on its `import typeof` the moment a `@salmon/shared`
 * module reaches for it — `storage` does, through its native adapter.
 *
 * `packages/ui` never renders RN, so the module only has to exist. This stub
 * is aliased in `vitest.config.ts` and is deliberately empty: anything that
 * actually needed an RN API in a DOM test would be a boundary violation
 * (AGENTS.md, ownership model), and should fail loudly rather than be faked.
 */
export {};
