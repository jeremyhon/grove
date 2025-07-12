---
description: Grove CLI Tool - Git Worktree Manager built with Bun
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

# Grove: Development Guide

This is a CLI tool built with Bun that simplifies git worktree management with automatic port assignment, file copying, and dependency management.

## Technology Stack

- **Language:** TypeScript
- **Runtime:** Bun (use `bun` instead of `node` or `npm`)
- **CLI Framework:** commander
- **Linter/Formatter:** Biome
- **Testing:** `bun:test`
- **Build:** `bun build --compile` for single binary distribution

## Development Workflow

The recommended development workflow for Grove:

1. **Make changes**: Edit code in the CLI commands or services
2. **Test locally**: Run `bun run src/index.ts <command>` to test changes
3. **Run tests**: Execute `bun test` to verify functionality
4. **Iterate**: Repeat steps 1-3 as needed
5. **Final cleanup**: Once satisfied with changes:
   - Remove unnecessary imports and debug code
   - Run `bun run check` for linting, formatting, and typechecking
6. **Update documentation**: Update CLAUDE.md if changes affect architecture, commands, or workflow
7. **Commit**: Use conventional commit style for version control

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
│   ├── file.service.ts
│   ├── hook.service.ts
│   └── log.service.ts
├── utils/                # Helper functions
└── types.ts              # TypeScript types
tests/                    # Test files (separate from src/)
```

Grove uses separate `src/` and `tests/` directories for optimal CLI tool distribution.

## Available Commands

### `grove init [--verbose]`
Initializes Grove configuration for a git project:
- Generates unique project ID (`proj_xxxxxxxx`)
- Auto-detects package manager from lockfiles (bun, yarn, pnpm, npm)
- Creates `.grove-config.json` with sensible defaults
- Initializes global state in `~/.grove/state.json`
- Validates git repository and prevents double initialization

### `grove setup <feature> [--verbose]`
Creates a new worktree for feature development:
- Sanitizes feature name to git-safe branch name
- Creates worktree in `../project-feature` directory
- Auto-assigns next available port (starting from base port)
- Copies specified files (`.env*`, `.vscode/`) to new worktree
- Runs post-setup hooks (e.g., `bun install`)
- Outputs target path for shell integration: `cd $(grove setup feature)`

### `grove list [--verbose] [--json]`
Lists all worktrees with comprehensive information:
- Shows path, branch, port, status (main/feature), and commit hash
- Supports `--json` flag for scriptable output
- Clean table format with colored output
- Relative path display for readability

### `grove merge [--verbose] [--no-hooks]`
Merges the current feature branch back to main and cleans up the worktree:
- Validates current directory is a worktree (not main branch)
- Checks for uncommitted changes before proceeding
- Runs `preMerge` hooks (e.g., tests, linting)
- Orchestrates merge flow: switch to main → pull latest → merge → cleanup
- Runs `postMerge` hooks after successful merge
- Outputs main worktree path for shell integration: `cd $(grove merge)`

### `grove delete <path> [--force] [--verbose]`
Deletes a worktree and releases its assigned port:
- Validates target path exists and is a git repository
- Prevents deletion of main worktree
- Warns about uncommitted changes
- Interactive confirmation prompt (unless `--force` flag used)
- Runs `preDelete` and `postDelete` hooks
- Safely removes worktree and releases port assignment

## Configuration System

### Project Config (`.grove-config.json`)
```json
{
  "projectId": "proj_fi0a42hf",
  "project": "grove",
  "basePort": 3000,
  "packageManager": "bun",
  "copyFiles": [".env*", ".vscode/"],
  "hooks": {
    "postSetup": "bun install",
    "preMerge": "bun test",
    "postMerge": "echo 'Merge completed'",
    "preDelete": "echo 'Cleaning up...'",
    "postDelete": "echo 'Worktree deleted'"
  }
}
```

### Global State (`~/.grove/state.json`)
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

### Hook System
Grove supports user-defined hooks that execute at specific points in the workflow:

- **`postSetup`**: Runs after creating a new worktree (e.g., `bun install`)
- **`preMerge`**: Runs before merging (e.g., `bun test`)
- **`postMerge`**: Runs after successful merge (e.g., deployment)
- **`preDelete`**: Runs before deleting worktree (e.g., cleanup)
- **`postDelete`**: Runs after deleting worktree (e.g., notifications)

Hooks receive contextual environment variables:
- `GROVE_PROJECT_ID`, `GROVE_PROJECT_NAME`, `GROVE_BASE_PORT`
- `GROVE_PACKAGE_MANAGER`, `GROVE_PROJECT_PATH`
- `GROVE_BRANCH`, `GROVE_PORT`, `GROVE_WORKTREE_PATH` (when applicable)

## Logging System

Grove uses a structured logging system that provides clean, organized output with optional verbose details:

### Core Logging API
- `log()` - Basic messages to stderr
- `log.verbose()` - Detailed logs only shown with `--verbose` flag
- `log.success()` - Success messages with ✅ icons
- `log.error()` - Error messages with ❌ icons
- `log.warn()` - Warning messages with ⚠️ icons
- `log.spinner()` - Progress indicators for long operations
- `log.stdout()` - Clean output to stdout for shell integration

### Stream Management
- All user feedback goes to **stderr** to keep stdout clean
- Shell integration paths (for `cd $(grove command)`) go to **stdout**
- Progress spinners for git operations, file copying, and hook execution
- Colored output with contextual icons for better visual hierarchy

### Usage Examples
```bash
# Normal mode - minimal essential feedback
grove setup "new feature"
# Output: /path/to/worktree (clean for shell integration)

# Verbose mode - detailed operation logs and progress
grove setup "new feature" --verbose
# Shows: Creating worktree spinner → Hook execution spinner → Success

# Shell integration works seamlessly
cd $(grove setup "feature")  # Changes to new worktree
cd $(grove merge)            # Returns to main after merge
```

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
- HookService: User-defined shell command execution
- LogService: Structured logging with progress indicators
- Commands: CLI command validation (init, setup, list, merge, delete)
- Types: TypeScript interface validation

**Current Status:** 61 passing tests with 0 failures

## Build & Distribution

- **Build Grove:** `bun run build` - builds Grove into a single binary
- **Install Grove to PATH:** `bun run install` - builds Grove and installs it to your system PATH
- **Install Dependencies:** `bun install` - installs npm package dependencies (different from `bun run install`)

## Key Dependencies

- **commander** - CLI framework
- **prompts** - Interactive prompts
- **chalk** - Terminal colors
- **cli-table3** - Table formatting
- **ora** - Loading spinners
- **glob** - File pattern matching
- **zod** - Config validation