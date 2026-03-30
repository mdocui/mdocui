# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.6.x   | :white_check_mark: |
| < 0.6   | :x: |

## Reporting a Vulnerability

If you discover a security vulnerability in mdocUI, please report it responsibly.

**Do not open a public issue.** Instead, use [GitHub's private vulnerability reporting](https://github.com/mdocui/mdocui/security/advisories/new).

We will:
- Acknowledge your report within 48 hours
- Provide an estimated timeline for a fix within 5 business days
- Credit you in the release notes (unless you prefer to remain anonymous)

## Scope

This policy covers:
- `@mdocui/core` — streaming parser, attribute parsing, prompt generation
- `@mdocui/react` — renderer, components, error boundaries
- `@mdocui/cli` — init, generate, preview server

## Known Security Measures

- **Prototype pollution protection** — `Object.create(null)` + unsafe key blocklist in attribute parser
- **URL sanitization** — `javascript:` and `data:` schemes blocked in Image and Link components
- **No eval/Function** — no dynamic code execution anywhere in the library
- **No innerHTML** — all rendering via React virtual DOM
