<img width="50px" height="50px" align="right" alt="Cloud Blocks logo" src="https://raw.githubusercontent.com/leighton-digital/cloud-blocks/HEAD/images/cloud-blocks.png?sanitize=true" title="Leighton Cloud Blocks"/>

# Cloud Blocks

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/leighton-digital/cloud-blocks/blob/main/LICENSE)
![Maintained](https://img.shields.io/maintenance/yes/2025)
[![CI](https://github.com/leighton-digital/cloud-blocks/actions/workflows/main.yaml/badge.svg)](https://github.com/leighton-digital/cloud-blocks/actions/workflows/main.yaml)
[![Release](https://github.com/leighton-digital/cloud-blocks/actions/workflows/release-publication.yaml/badge.svg)](https://github.com/leighton-digital/cloud-blocks/actions/workflows/release-publication.yaml)![Code style: Biome](https://img.shields.io/badge/code%20style-biome-60A5FA?logo=biome)

**Cloud Blocks** is an open-source collection of **AWS CDK constructs** designed to help teams build secure, reusable, and production-ready cloud infrastructure faster.

Read more in the docs here: [Cloud Blocks Docs](https://leighton-digital.github.io/cloud-blocks/)

---

## Purpose

- Provide **reusable building blocks** for AWS CDK projects.
- Promote **best practices** in networking, observability, security, and more.
- Reduce boilerplate by delivering **ready-to-use constructs**.
- Empower teams to adopt CDK more quickly and consistently.

---

## Installation & Usage

Install the `@leighton-digital/cloud-blocks` npm package in the project:

```bash
pnpm install @leighton-digital/cloud-blocks
```

Use in your CDK app:

```ts
import * as cdk from "aws-cdk-lib";
import { ApiGatewayCloudFrontDistribution } from "@leighton-digital/cloud-blocks";

export class MyStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new ApiGatewayCloudFrontDistribution(this, "ApiGwCdn", {
      domainName: "example.com"
    });
  }
}
```

> See each Constructs README for construct-specific props and examples.

---

## Getting Started (Developers)

Clone the repo and install dependencies:

```bash
git clone https://github.com/leighton-digital/cloud-blocks.git
cd cloud-blocks
pnpm install
```

**Set up development environment:**

```bash
pnpm dev:setup
```

> This installs **Lefthook** git hooks for automated formatting, linting, spell checking, and pre-commit checks.

### Code Quality Tools

This project uses several tools to maintain code quality and consistency:

- **[Biome](https://biomejs.dev/)**: Fast linting and formatting for TypeScript/JavaScript
- **[CSpell](https://cspell.org/)**: Spell checking configured for UK English
- **[TypeScript](https://www.typescriptlang.org/)**: Type checking and compilation
- **[Lefthook](https://github.com/evilmartians/lefthook)**: Git hooks for automated quality checks

**Language Standards**: All documentation and comments use UK English spelling (colour, behaviour, organisation, etc.)

### Common Commands

* **Build all packages**

  ```bash
  pnpm run build
  ```
* **Run tests**

  ```bash
  pnpm test
  ```
* **Lint & format (Biome)**

  ```bash
  pnpm run lint
  pnpm run format:check
  ```
* **Spell check (CSpell)**

  ```bash
  pnpm spell:check
  ```
* **Type-check**

  ```bash
  pnpm run typecheck
  ```

* **Test CDK synthesis**

  ```bash
  cd tests/test-project
  pnpx cdk synth --all
  ```

> **Lefthook** (installed via `pnpm run dev:setup`) runs local git hooks to format/lint staged files, check spelling (CSpell), and run type/build checks before commits and pushes.

---

## Testing & Validation

### CDK Construct Validation

This project includes a comprehensive testing approach to ensure all CDK constructs work correctly:

**Test Project** (`tests/test-project/`)
- Contains a real CDK application that uses the constructs from this package
- Validates that constructs can be instantiated and synthesized without errors
- Serves as both a test and example implementation

**Automated Synthesis Testing**
- GitHub Actions automatically runs `cdk synth --all` on the test project
- Tests against multiple CDK versions to ensure compatibility
- Catches compilation errors, configuration issues, and CDK-specific problems
- Ensures constructs generate valid CloudFormation templates
- Runs on every pull request to prevent broken constructs from being merged

**CDK Version Compatibility**
- Best endeavours are made to ensure compatibility with CDK versions up to 6 months old
- Automated testing validates constructs against both current and previous CDK versions
- This ensures existing projects can upgrade Cloud Blocks without being forced to update CDK immediately

**Local Testing**
```bash
# Build the constructs
pnpm run build

# Test synthesis locally
cd tests/test-project
pnpx cdk synth --all
```

This approach ensures that:
- ✅ Constructs compile correctly
- ✅ CDK synthesis succeeds
- ✅ CloudFormation templates are generated properly
- ✅ Real-world usage patterns work as expected

---

## Project Structure

```
.
├── src/                       # Individual CDK construct packages
│   ├── api-gateway-cloudfront-distribution/
│   └── ...
├── tests/
│   └── test-project/          # CDK test application for construct validation
│       ├── lib/               # Test stack implementations
│       ├── bin/               # CDK app entry point
│       └── cdk.json           # CDK configuration
├── .changeset/                # Changesets for versioning & changelogs
├── CONTRIBUTING.md            # How to contribute
├── CONTRIBUTORS.md            # Project contributors
├── CODE_OF_CONDUCT.md         # Community guidelines
├── PUBLISHING.md              # Publishing process
└── README.md
```

---

## Creating New Constructs

This project includes a **Plop generator** to create new CDK constructs with consistent structure and boilerplate:

```bash
pnpm generate construct
```

The generator creates:
- Complete directory structure following project conventions
- TypeScript construct class with props interface
- Comprehensive Jest tests with CDK Nag compliance
- Documentation (README.md) with examples
- Automatic export updates

See [Plop Generator Documentation](./docs/PLOP_GENERATOR.md) for detailed usage instructions.

---

## Contributing

We welcome contributions from the community! 🎉

* Read the [Contributing Guide](https://github.com/leighton-digital/cloud-blocks/blob/main/CONTRIBUTING.md) for branching, coding standards, and review process.
* Follow the [Code of Conduct](https://github.com/leighton-digital/cloud-blocks/blob/main/CODE_OF_CONDUCT.md).
* See [Contributors](https://github.com/leighton-digital/cloud-blocks/blob/main/CONTRIBUTORS.md) for acknowledgements.
* Maintainers: follow [Publishing Guidelines](https://github.com/leighton-digital/cloud-blocks/blob/main/PUBLISHING.md) for releases.

**Typical flow**

1. Fork → feature branch.
2. Make changes, add tests, run checks.
3. Open a PR.

**Lefthook** (set up via `pnpm run dev:setup`) ensures format/lint fixes are applied, spelling is checked (UK English), and type/build checks run pre-commit and pre-push.

---

## Release Process

Releases are automated via **GitHub Actions**:

1. Contributors create changesets with their PRs.
2. A **Release PR** is generated with version bumps and changelogs.
3. When merged, CI builds and **publishes** to the public npm registry.

Manual steps are documented in [PUBLISHING.md](https://github.com/leighton-digital/cloud-blocks/blob/main/PUBLISHING.md).

---

## License

MIT License — see the [LICENSE](https://github.com/leighton-digital/cloud-blocks/blob/main/LICENSE) file for details.

---

<img src="https://raw.githubusercontent.com/leighton-digital/cloud-blocks/HEAD/images/leighton-logo.svg" width="200" alt="Leighton Digital logo" />
