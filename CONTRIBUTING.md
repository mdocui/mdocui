# Contributing to mdocUI

Thanks for your interest in contributing to mdocUI! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone git@github.com:YOUR_USERNAME/mdocui.git
   cd mdocui
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Build all packages:
   ```bash
   pnpm build
   ```
5. Run tests to verify everything works:
   ```bash
   pnpm test
   ```

## Development Workflow

This is a pnpm monorepo with three packages:

| Package | Path | Description |
|---------|------|-------------|
| `@mdocui/core` | `packages/core` | Streaming parser, registry, prompt generator |
| `@mdocui/react` | `packages/react` | React renderer, 24 components, useRenderer hook |
| `@mdocui/cli` | `packages/cli` | CLI for scaffolding, preview, prompt generation |

### Commands

```bash
pnpm build          # Build all packages (via Turborepo)
pnpm test           # Run all tests
pnpm lint           # Lint with Biome
pnpm lint:fix       # Auto-fix lint issues
pnpm clean          # Remove dist/ from all packages
```

### Making Changes

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-change
   ```

2. Make your changes — keep commits focused and descriptive

3. Add or update tests for your changes

4. Ensure everything passes:
   ```bash
   pnpm build && pnpm test && pnpm lint
   ```

5. Push and open a pull request against `main`

## Code Style

- We use [Biome](https://biomejs.dev/) for formatting and linting
- TypeScript strict mode is enabled
- No `any` types unless absolutely necessary
- Prefer explicit return types on exported functions

## Architecture Guidelines

### Core Package

- The parser is streaming-first — it processes chunks character by character
- All attribute parsing uses `Object.create(null)` to prevent prototype pollution
- Zod schemas in ComponentDefinition drive both runtime validation and prompt generation
- No external dependencies beyond Zod

### React Package

- All 24 components are theme-neutral — they use `currentColor` and `inherit`, never hardcoded colors
- Consumers style via `classNames` prop or `data-mdocui-*` CSS selectors
- The `components` prop merges on top of defaults, not replaces
- Built-in `SimpleMarkdown` handles basic prose; consumers can override with `renderProse`

### CLI Package

- Uses only Node.js built-ins (`node:http`, `node:fs`, `node:path`) — no Express or other server deps
- The `init` command detects frameworks by reading `package.json` dependencies
- The `preview` server is a self-contained HTML page with inline JS/CSS

## Adding a New Component

1. Define it in `packages/react/src/definitions.ts` with a Zod schema
2. Implement it in the appropriate file under `packages/react/src/components/`
3. Add it to `defaultComponents` in `packages/react/src/defaults.ts`
4. Add it to the appropriate group in `defaultGroups`
5. Add tests in `packages/react/tests/components.test.tsx`
6. Update the component count in READMEs if it changes

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new functionality
- Update relevant READMEs if adding user-facing features
- All CI checks must pass (build, test, lint)
- Open an issue first for large changes to discuss the approach

## Reporting Issues

- Use [GitHub Issues](https://github.com/mdocui/mdocui/issues)
- Include reproduction steps and expected vs actual behavior
- For bugs, include your Node.js version and package versions

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
