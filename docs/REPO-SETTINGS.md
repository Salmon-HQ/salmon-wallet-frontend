# Repository settings runbook (maintainers)

GitHub settings that the repo's files reference but cannot enforce by
themselves. Apply after the CI workflow (`.github/workflows/ci.yml`) has
landed on `main`, so the required checks exist. Everything here is idempotent
and takes effect immediately.

## 1. Branch protection for `main` (ruleset)

Without this, CODEOWNERS is decorative, force-pushes to `main` are possible,
and CI is advisory. Settings → Rules → Rulesets → New branch ruleset:

- **Target**: `main` (include default branch), enforcement **Active**.
- **Require a pull request before merging**: 1 approval, **Require review
  from Code Owners** ON, dismiss stale approvals ON.
- **Require status checks to pass**: add `typecheck / lint / test / i18n`,
  `conventional PR title`, `workflow security lint`. Require branches to be
  up to date: OFF (solo maintainer; turn on if the repo gains write
  collaborators).
- **Block force pushes** and **Restrict deletions**: ON.

Equivalent CLI: `gh api repos/Salmon-HQ/salmon-wallet-frontend/rulesets
--method POST --input <ruleset.json>` — ask before scripting this; the UI is
clearer the first time.

## 2. Squash-only merges

The `conventional PR title` check exists because the PR title becomes the
commit on `main`. That only holds with squash merges.

Settings → General → Pull Requests:

- Allow squash merging: ON, default commit message **Pull request title**.
- Allow merge commits: OFF. Allow rebase merging: OFF.
- Automatically delete head branches: ON (keeps the branch list clean).

## 3. Deploy environment gate

Today anyone with write access can deploy to production by pushing a
`web/v*` tag. To require a human approval step:

1. Settings → Environments → New environment: `production`, add yourself as
   **Required reviewer**.
2. In `.github/workflows/deploy-web.yml`, add `environment: production` to
   the deploy job.

Step 2 is a workflow change — do it in a PR when enabling the environment.

## 4. Advanced Security toggles (one screen, three switches)

Settings → Advanced Security:

- **Private vulnerability reporting**: ON. SECURITY.md and the issue
  templates point users to GitHub Security Advisories; without this switch
  that flow does not exist. (Not automatic on public repos.)
- **Dependabot alerts**: ON. Warns about known vulnerabilities in
  dependencies even when no update exists yet. (Usually default-on for
  public repos — verify.)
- **Dependabot security updates**: ON. Opens patch PRs immediately when an
  advisory lands, bypassing the 7-day cooldown that regular version updates
  respect (`.github/dependabot.yml`). Version updates themselves need no
  toggle — the committed config file activates them.

## 5. Labels

Area labels used by templates and triage: `app:web`, `app:mobile`,
`app:extension`, `pkg:shared`, `pkg:ui`, `security`, `e2e` (the `e2e` label
will trigger the E2E workflow on PRs once that workflow lands). Create once:

```bash
gh label create app:web --color 1d76db --description "apps/web"
gh label create app:mobile --color 1d76db --description "apps/mobile"
gh label create app:extension --color 1d76db --description "apps/extension"
gh label create pkg:shared --color 0e8a16 --description "packages/shared"
gh label create pkg:ui --color 0e8a16 --description "packages/ui"
gh label create security --color b60205 --description "security-relevant change or report"
gh label create e2e --color fbca04 --description "run the E2E suite on this PR"
```
