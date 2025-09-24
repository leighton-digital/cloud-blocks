# Contributing

Thank you for considering contributing to the Leighton API Test Harness! We welcome contributions from the community to help improve this project. Here are some guidelines to help you get started:

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Getting Started

1. Install Node.js (v22.15.1 recommended)
2. Clone the repository
3. Install dependencies: `npm install`
4. Run tests: `npm test`

## Local Development

To test changes to this package locally in another project:

1. Build the package:
   ```bash
   npm run build
   ```

2. Create a symbolic link:
   ```bash
   npm link
   ```

3. In your test project:
   ```bash
   npm link @leighton-digital/{cloud blocks package name}
   ```

4. To remove the link:
   ```bash
   npm unlink @leighton-digital/{cloud blocks package name}
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
- Write clear commit messages
- Add tests for new features
- Update documentation

## Testing Guidelines

We use Jest for testing. Please ensure:

1. All existing tests pass
2. New features have appropriate tests

## Pull Request Process

1. Ensure all tests pass: `npm test`
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

<img src="https://raw.githubusercontent.com/leighton-digital/cloud-blocks/blob/main/images/leighton-logo.svg" width="200" />
