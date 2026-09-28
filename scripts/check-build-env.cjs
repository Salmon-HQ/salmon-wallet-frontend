#!/usr/bin/env node
/*
 * Build-environment guard (runs on `preinstall`).
 *
 * Fails fast with an actionable message when the repo is installed with the
 * wrong package manager or an unsupported Node version. This is what makes the
 * source build reproducible for AMO / Chrome Web Store reviewers: npm/yarn
 * cannot resolve this monorepo's `workspace:*` dependencies, and an unsupported
 * Node version produces a different (or broken) build.
 *
 * Pure Node, zero dependencies, no network — safe to run before install.
 */
'use strict';

const SUPPORTED_NODE_MAJORS = [24];
const DOCS = 'SOURCE_BUILD_INSTRUCTIONS.md';

function fail(message) {
  console.error('\n\x1b[31m[build-env] ' + message + '\x1b[0m');
  console.error('[build-env] See ' + DOCS + ' for the exact, supported setup.\n');
  process.exit(1);
}

// 1. Package manager must be pnpm.
const ua = process.env.npm_config_user_agent || '';
if (!ua.startsWith('pnpm')) {
  fail(
    'This repository must be installed with pnpm (got "' +
      (ua.split(' ')[0] || 'unknown') +
      '").\nRun:  corepack enable && pnpm install'
  );
}

// 2. Node major must be supported.
const major = Number(process.versions.node.split('.')[0]);
if (!SUPPORTED_NODE_MAJORS.includes(major)) {
  fail(
    'Unsupported Node.js ' +
      process.versions.node +
      '. Use Node ' +
      SUPPORTED_NODE_MAJORS.join(' or ') +
      ' (see .nvmrc).\nRun:  nvm install && nvm use'
  );
}
