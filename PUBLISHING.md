# Publishing to npm

This guide explains how community leads can publish the **Cloud Blocks** package to npm from this **single-package (polyrepo)**. Publishing is **automated** via GitHub Actions using **semantic-release** and **Conventional Commits**.

---

## Prerequisites

1. All tests passing locally and in CI:

   ```bash
   pnpm test
   ```
2. An npm account with publish rights to the `@leighton-digital/*` scope.

   ```bash
   npm login
   ```
3. Access to the repo’s **`NPM_TOKEN`** secret (must be an **Automation** token if org requires 2FA).
4. `package.json` includes:

   ```json
   {
     "name": "@leighton-digital/<your-package>",
     "version": "0.0.0-development",
     "private": false,
     "packageManager": "pnpm@9",
     "publishConfig": { "access": "public" }
   }
   ```

   > `version` is managed by semantic-release at publish time. For scoped public packages, `publishConfig.access` must be `"public"`.

---

## Build

Build locally exactly as CI does:

```bash
pnpm install --frozen-lockfile
pnpm build
```

Your build should output distributable files (e.g., `dist/`) referenced by `package.json` fields like `main`, `module`, `types`, `exports`, etc.

---

## Versioning & Changelog (Automated)

We use **[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)** + **[semantic-release](https://github.com/semantic-release/semantic-release)**:

* `feat: …` → **minor**
* `fix: …` → **patch**
* `perf:` / `refactor:` may map to patch (configurable)
* `BREAKING CHANGE:` in the commit footer (or `feat!:` / `fix!:`) → **major**
* Changelog is generated automatically into `CHANGELOG.md`.

**Commit examples**

```
feat(parser): add YAML support
fix(cli): handle empty config without crashing
feat(api)!: remove deprecated v1 endpoints
BREAKING CHANGE: The v1 /users endpoint was removed in favour of /v2/users.
```

---

## How Publishing Works (GitHub Actions)

Releases are created **automatically** on pushes to `main` that include qualifying Conventional Commits.

### 1) Workflow file

The release is automatically performed through the [GitHub Release Workflow](https://github.com/leighton-digital/cloud-blocks/blob/main/.github/workflows/release-publication.yaml)


### 2) semantic-release config

The [releaserc.json](https://github.com/leighton-digital/cloud-blocks/blob/main/.releaserc.json) provides the release configuration.

### 3) Dependencies

The following packages have been installed to release the package:

```bash
semantic-release @semantic-release/{npm,git,changelog,commit-analyzer,release-notes-generator}
```

> Tip: To validate locally without publishing, run:
>
> ```bash
> pnpm dlx semantic-release --dry-run
> ```

---

## Triggering a Release

* Merge/push Conventional Commit(s) to `main`.
* The workflow computes the next version, updates `CHANGELOG.md`, creates a Git tag & GitHub Release, and publishes to npm.

> You don’t manually bump versions or run `pnpm publish`. CI handles it.

---

## Manual/Emergency Publishing (avoid if possible)

If CI is unavailable and you must publish:

1. Ensure working tree is clean and built:

   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   ```
2. **Strongly preferred**: run a local **dry run** first:

   ```bash
   pnpm dlx semantic-release --dry-run
   ```
3. If absolutely necessary to publish without semantic-release, you can:

   ```bash
   pnpm version patch|minor|major
   pnpm publish
   ```

   **Caveat:** This bypasses automation and will desync the next SR calculation. Afterward, reset `version` to `0.0.0-development` and push a corrective commit. Use only as a last resort.

---

## Biome & Lefthook Integration

To ensure code quality and consistency, **Biome** and **Lefthook** run locally and in CI.

### Local (via Lefthook)

* **pre-commit**

  * `biome format --write` on staged files
  * `biome lint` on staged files
* **pre-push**

  * `pnpm typecheck` and `pnpm test`
* **commit-msg**

  * `non-empty: run: test -s {1} || (echo "✖ Commit message is empty" && exit 1)`
  * `commitlint: run: pnpm commitlint --edit {1}`

### CI (via GitHub Actions)

Every PR and push to `main` should run:

```bash
pnpm format:check   # biome check --formatter
pnpm lint           # biome check --linter
pnpm typecheck
pnpm build
pnpm test
```

The **release** job runs these before publishing.

---

## Troubleshooting

### “No release published”

* **Cause:** No Conventional Commits since last release (no `feat`, `fix`, or `BREAKING CHANGE`).
* **Fix:** Use proper commit types; push again.

### “Semantic-release can’t find previous tag”

* **Cause:** Shallow clone.
* **Fix:** Ensure `actions/checkout` uses `fetch-depth: 0`.

### 403 from npm / publish failed

* **Cause:** Token lacks permission or isn’t an **Automation** token (when 2FA enforced).
* **Fix:** Regenerate `NPM_TOKEN` with Automation type; confirm org permissions.

### “Package is private”

* **Cause:** Missing public access for scoped package.
* **Fix:** Ensure `publishConfig.access: "public"` in `package.json`.

### Wrong branch

* **Cause:** Releasing from a non-configured branch.
* **Fix:** Update `.releaserc.json#branches` or use `main`.

### Changelog not updated

* **Cause:** Missing `@semantic-release/changelog` or `@semantic-release/git`.
* **Fix:** Ensure both plugins are present in config and installed.

---

## Checking Published Packages

View the package on npm:

```bash
npm view @leighton-digital/api-gateway-cloudfront-distribution
```

Check available versions:

```bash
npm view @leighton-digital/api-gateway-cloudfront-distribution versions
```

---

## Best Practices

* Before opening a PR:

  ```bash
  pnpm format:check
  pnpm lint
  pnpm typecheck
  pnpm test
  ```
* Use `npm pack` locally to preview the publish contents:

  ```bash
  pnpm pack
  ```
* Prefer CI-driven releases. Avoid manual `pnpm publish` except in emergencies.
* Adopt Conventional Commits consistently across all changes.

