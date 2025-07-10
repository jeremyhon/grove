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
- Use Node.js `fs/promises` APIs for directory operations: `mkdir()`, `rm()`, `stat()`
- Use `Bun.$` for git operations only (avoid for file system operations)
- Use `Bun.build()` with `--compile` flag for binary distribution

## File System Best Practices

- **Directory operations**: Use `mkdir(path, { recursive: true })` instead of `Bun.$`mkdir -p``
- **File deletion**: Use `rm(path, { recursive: true, force: true })` instead of `Bun.$`rm -rf``
- **File existence**: Use `stat(path)` or `FileService.pathExists()` instead of shell tests
- **Directory detection**: Use `stat(path).isDirectory()` instead of `test -d`
- **Only use `Bun.$`** for git commands that require shell interaction

## Key Dependencies

- **commander** - CLI framework
- **prompts** - Interactive prompts
- **chalk** - Terminal colors
- **cli-table3** - Table formatting
- **ora** - Loading spinners
- **glob** - File pattern matching
- **zod** - Config validation

## Testing

Use `bun test` to run tests. Grove has comprehensive test coverage:

```ts
import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm } from "node:fs/promises";

beforeEach(async () => {
  // Use Node.js fs APIs for test setup
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  // Clean up with Node.js fs APIs
  await rm(testDir, { recursive: true, force: true });
});

test("service functionality", () => {
  // Test implementation
});
```

**Test Coverage:**
- ConfigService: Config file handling, validation, global state
- GitService: Git operations, worktree management  
- PortService: Port assignment, cleanup, state management
- FileService: File operations, directory management
- Commands: CLI command validation
- Types: TypeScript interface validation

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
