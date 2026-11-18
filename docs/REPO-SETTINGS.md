# Repository settings runbook (maintainers)

GitHub settings that the repo's files reference but cannot enforce by
themselves. Apply after the CI workflow (`.github/workflows/ci.yml`) has
landed on `main`, so the required checks exist. Everything here is idempotent
and takes effect immediately.

## 1. Branch protection for `main` and `staging`

Both branches carry the same protection (Settings → Branches), so CI blocks a
merge instead of reporting on it:

- **Require a pull request before merging**: ON, with no approval count, since
  one maintainer merges. Nothing reaches either branch by a direct push.
- **Require status checks to pass**: `typecheck / lint / test / i18n`,
  `dependency audit`, `workflow security lint`, `conventional PR title`; `main`
  also requires `main takes PRs from staging`. Require branches to be up to
  date: OFF.
- **Restrict who can push**: the one maintainer who merges. Merging a pull
  request is a push, so nobody else can merge.
- **Do not allow bypassing the above settings**: ON, so the rules hold for
  administrators too.
- Force pushes and deletions: blocked.

A required check has to exist on the pull request's branch: a branch opened
before a check was added to CI is updated from `staging` once to pick it up.

To read or reapply it:

```bash
gh api repos/Salmon-HQ/salmon-wallet-frontend/branches/staging/protection
gh api -X PUT repos/Salmon-HQ/salmon-wallet-frontend/branches/staging/protection --input protection.json
```

### Agent review (advisory)

`.github/workflows/agent-review.yml` runs a model over each pull request from a
branch of this repository and leaves inline comments. It needs two things set
once: the Claude GitHub App installed on the repository, and an Actions secret
named `ANTHROPIC_API_KEY`. Do not add it to the required checks: it advises, a
maintainer decides. It does not run on fork pull requests, which carry no
secrets.

## 2. Merge settings for the staging flow

PRs into `staging` are squash-merged, so the PR title becomes the commit and
the `conventional PR title` check (`pr-rules.yml`) guards it. The release PR
from `staging` to `main` is merged with a merge commit, so `main` shares
`staging`'s history (`CONTRIBUTING.md`, "Pull requests").

Settings → General → Pull Requests:

- Allow squash merging: ON, default commit message **Pull request title and
  description**; otherwise a PR with one commit lands with that commit's
  subject instead of the checked title.
- Allow merge commits: ON, for the release PR. Allow rebase merging: OFF.
- Automatically delete head branches: ON (keeps the branch list clean), with
  a `Protect staging` ruleset (branch `refs/heads/staging`: block deletion,
  block force pushes) so merging a release PR never deletes `staging`.
- Default branch: `staging`, so a contributor's clone and PR start there.

## 3. Deploy environment gate

The web wallet and its `deploy-web.yml` (triggered by `web/v*` tags) were
retired on 2026-09-02, so no workflow deploys to production any more.
`build-extension.yml` (`extension/v*` tags or dispatch) only produces
artifacts; a human uploads them to the stores. If a deploying workflow
returns, gate it: Settings → Environments → New environment `production`
with yourself as **Required reviewer**, and `environment: production` on the
deploy job.

## 4. Advanced Security toggles

Settings → Advanced Security:

- **Secret scanning** and **Push protection**: ON. A push that carries a
  provider token is refused before it lands. Seed phrases and private keys
  are not provider tokens; `pnpm check:no-secrets` covers those.
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

Area labels used by templates and triage: `app:mobile`, `app:extension`,
`pkg:shared`, `pkg:ui`, `security`, `e2e` (the `e2e` label triggers the E2E
workflow on PRs). Create once:

```bash
gh label create app:mobile --color 1d76db --description "apps/mobile"
gh label create app:extension --color 1d76db --description "apps/extension"
gh label create pkg:shared --color 0e8a16 --description "packages/shared"
gh label create pkg:ui --color 0e8a16 --description "packages/ui"
gh label create security --color b60205 --description "security-relevant change or report"
gh label create e2e --color fbca04 --description "run the E2E suite on this PR"
```
