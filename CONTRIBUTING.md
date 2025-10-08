# Contributing

Thank you for considering contributing to the Leighton Cloud Blocks project! We welcome contributions from the community to help improve this project. Here are some guidelines to help you get started:

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Getting Started

1. Install Node.js (v22.15.1 recommended)
2. Clone the repository
3. Install dependencies: `pnpm install`
4. Run tests: `pnpm test`

## Local Development

To test changes to this package locally in another project:

1. Build the package:
   ```bash
   pnpm run build
   ```

2. Create a symbolic link:
   ```bash
   pnpm link
   ```

3. In your test project:
   ```bash
   pnpm link @leighton-digital/cloud-blocks
   ```

4. To remove the link:
   ```bash
   pnpm unlink @leighton-digital/cloud-blocks
   ```

> Note: Ensure your test project has the same version of Node.js and compatible dependencies.

## How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Code Style

- Follow TypeScript best practices
- Use Biome for linting and formatting
- Use UK English spelling in documentation and comments
- Write clear commit messages
- Add tests for new features
- Update documentation

### Spelling and Language Standards

This project uses **CSpell** to enforce consistent spelling and language standards:

- **UK English**: All documentation, comments, and text content should use UK English spellings (e.g., "colour", "behaviour", "organisation")
- **Pre-commit checks**: CSpell runs automatically before commits to catch spelling errors
- **Custom dictionary**: Technical terms, AWS services, and project-specific vocabulary are included in the custom dictionary

**Common UK vs US spellings to be aware of:**
- Use "colour" not "color"
- Use "behaviour" not "behavior"
- Use "organisation" not "organization"
- Use "realise" not "realize"
- Use "analyse" not "analyze"
- Use "centre" not "center"

**Running spelling checks manually:**
```bash
# Check all files
pnpm spell:check

# Check specific files
pnpm spell:check-files path/to/file.ts
```

**Adding new technical terms:**
If CSpell flags legitimate technical terms or project-specific vocabulary, add them to the `words` array in `cspell.json`.

## Testing Guidelines

We use Jest for testing. Please ensure:

1. All existing tests pass
2. New features have appropriate tests

## Pull Request Process

1. Ensure all tests pass: `pnpm test`
2. Update the documentation if needed
3. Add a clear description of your changes
4. Reference any related issues
5. Wait for review
6. Be prepared to make requested changes

## Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions.

## Questions?

If you have any questions about contributing, feel free to open an issue or contact the maintainers.

---

<img src="https://raw.githubusercontent.com/leighton-digital/cloud-blocks/HEAD/images/leighton-logo.svg" width="200" />
