---
description: Grove CLI Tool - Git Worktree Manager built with Bun
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

# Grove: Git Worktree Manager

This is a CLI tool built with Bun that simplifies git worktree management with automatic port assignment, file copying, and dependency management.

## Technology Stack

- **Language:** TypeScript
- **Runtime:** Bun (use `bun` instead of `node` or `npm`)
- **CLI Framework:** commander
- **Linter/Formatter:** Biome
- **Testing:** `bun:test`
- **Build:** `bun build --compile` for single binary distribution

## Bun Usage

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Bun automatically loads .env, so don't use dotenv

## Bun APIs for Grove

- Prefer `Bun.file()` and `Bun.write()` for file I/O operations
- Use `Bun.$` for executing shell commands (git operations)
- Use `Bun.build()` with `--compile` flag for binary distribution

## Key Dependencies

- **commander** - CLI framework
- **prompts** - Interactive prompts
- **chalk** - Terminal colors
- **cli-table3** - Table formatting
- **ora** - Loading spinners
- **glob** - File pattern matching
- **zod** - Config validation

## Testing

Use `bun test` to run tests:

```ts
import { test, expect } from "bun:test";

test("config service", () => {
  // Test configuration loading
});
```

## Architecture

```
src/
├── index.ts              # CLI entry point
├── commands/             # Command implementations
│   ├── setup.ts
│   ├── init.ts
│   ├── list.ts
│   ├── merge.ts
│   └── delete.ts
├── services/             # Core business logic
│   ├── config.service.ts
│   ├── git.service.ts
│   ├── port.service.ts
│   └── file.service.ts
├── utils/                # Helper functions
└── types.ts              # TypeScript types
```

## Configuration Files

- **Project Config:** `.grove-config.json` (committed to git)
- **Global State:** `~/.grove/state.json` (managed by Grove)

## Build & Distribution

Use `bun build ./src/index.ts --compile --outfile grove` to create a single binary.
