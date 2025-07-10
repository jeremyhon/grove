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
tests/                    # Test files (separate from src/)
```

## Project Structure

Grove uses separate `src/` and `tests/` directories for optimal CLI tool distribution.

## Configuration Files

- **Project Config:** `.grove-config.json` (committed to git)
- **Global State:** `~/.grove/state.json` (managed by Grove)

## Build & Distribution

Use `bun build ./src/index.ts --compile --outfile grove` to create a single binary.

## Current Functionality

Grove currently implements the core commands for git worktree management:

### Available Commands

#### `grove init`
Initializes Grove configuration for a git project:
- Generates unique project ID (`proj_xxxxxxxx`)
- Auto-detects package manager from lockfiles (bun, yarn, pnpm, npm)
- Creates `.grove-config.json` with sensible defaults
- Initializes global state in `~/.grove/state.json`
- Validates git repository and prevents double initialization

```bash
grove init [--verbose]
```

#### `grove setup <feature>`
Creates a new worktree for feature development:
- Sanitizes feature name to git-safe branch name
- Creates worktree in `../project-feature` directory
- Auto-assigns next available port (starting from base port)
- Copies specified files (`.env*`, `.vscode/`) to new worktree
- Runs post-setup hooks (e.g., `bun install`)
- Outputs target path for shell integration: `cd $(grove setup feature)`

```bash
grove setup "new feature" [--verbose]
cd $(grove setup "new feature")  # Shell integration
```

#### `grove list`
Lists all worktrees with comprehensive information:
- Shows path, branch, port, status (main/feature), and commit hash
- Supports `--json` flag for scriptable output
- Clean table format with colored output
- Relative path display for readability

```bash
grove list [--verbose] [--json]
```

### Configuration

**Project Config (`.grove-config.json`):**
```json
{
  "projectId": "proj_fi0a42hf",
  "project": "grove",
  "basePort": 3000,
  "packageManager": "bun",
  "copyFiles": [".env*", ".vscode/"],
  "hooks": {
    "postSetup": "bun install"
  }
}
```

**Global State (`~/.grove/state.json`):**
```json
{
  "projects": {
    "proj_fi0a42hf": {
      "basePath": "/Users/user/dev/grove",
      "portAssignments": {
        "/Users/user/dev/grove": 3000,
        "/Users/user/dev/grove-feature": 3001
      }
    }
  }
}
```

### Example Workflow

```bash
# Initialize grove in a git project
grove init

# Create a new feature worktree
cd $(grove setup "user authentication")

# List all worktrees
grove list

# Development work happens in the feature worktree...
# (merge and delete commands coming in Phase 3)
```

### Testing Status

- **61 passing tests** with 0 failures
- Complete test coverage for all services and commands
- Integration tests for full workflow
- TypeScript type safety validation
