# Grove: Git Worktree Manager

## Implementation Plan

Grove is a command-line tool that simplifies git worktree management with automatic port assignment, file copying, and dependency management.

## Project Overview

**(Unchanged)**

### Core Features

**(Unchanged)**

---

### Technical Specification

#### Technology Stack

- **Language:** TypeScript
- **Core Toolchain:** [Bun](https://bun.sh/) (Runtime, Bundler, Test Runner, Package Manager)
- **Distribution:** Single, self-contained, cross-platform binary via `bun build`.
- **Linter & Formatter:** [Biome](https://biomejs.dev/)

#### Architecture

```
grove/
├── src/                      # Source code
│   ├── index.ts              # CLI entry point
│   ├── commands/             # Command implementations
│   │   ├── setup.ts
│   │   └── ...
│   ├── services/             # Core business logic
│   │   ├── config.service.ts
│   │   ├── git.service.ts
│   │   ├── port.service.ts
│   │   └── file.service.ts
│   ├── utils/                # Reusable helper functions (logger, etc.)
│   └── types.ts              # Core TypeScript types and interfaces
├── tests/                    # Tests using `bun:test`
├── package.json              # Project manifest
├── tsconfig.json             # TypeScript configuration
├── biome.json                # Biome linter/formatter configuration
└── scripts/
    └── install.sh            # Universal installer script
```

#### Key Libraries

- **CLI Framework:** [commander](https://github.com/tj/commander.js) - The de-facto standard for building Node.js command-line interfaces.
- **Interactive Prompts:** [prompts](https://github.com/terkelg/prompts) - For user confirmations (e.g., on delete).
- **Terminal UI:** `chalk` (colors), `cli-table3` (tables), `ora` (spinners).
- **File Pattern Matching:** `glob` - For resolving file patterns like `.env*`.
- **Configuration Validation:** `zod` - For runtime validation of config files.

#### State vs. Configuration Design

We will separate **user-defined configuration** from **machine-managed state**.

- **Configuration:** Lives in `.grove-config.json` in your project. It's meant for you to edit and check into Git.
- **State:** Lives in `~/.grove/state.json`. It's managed by Grove, contains runtime data like port assignments, and **should not** be checked into Git.

#### Configuration & State Files

**Project Config:** `.grove-config.json`

```json
{
  "projectId": "proj_a8b2cde3", // Unique ID generated on init
  "project": "myapp",
  "basePort": 3000,
  "packageManager": "bun",
  "copyFiles": [".env*", ".vscode/"],
  "hooks": {
    "postSetup": "bun install"
  }
}
```

**Global State:** `~/.grove/state.json`

```json
{
  "projects": {
    "proj_a8b2cde3": {
      "basePath": "/path/to/project",
      "portAssignments": {
        "/path/to/project": 3000,
        "/path/to/project-feature-a": 3001
      }
    }
  }
}
```

---

## Implementation Progress

**Current Status:** Phase 2 Complete ✅ | Phase 3 Ready to Begin 🚀

## Implementation Plan

### Phase 1: Core Infrastructure & Setup ✅ **COMPLETED**

#### 1.1. Project Initialization ✅

- [x] Initialize project with `bun init`.
- [x] Install dependencies: `bun add commander prompts chalk cli-table3 ora glob zod`.
- [x] Set up Biome for formatting and linting: `bunx @biomejs/biome init`.
- [x] Configure `biome.json` and add scripts to `package.json` for checking and applying formats/lints.
- [x] Create the source directory structure.
- [x] Set up pre-commit hooks with Husky for automated linting and type checking.

#### 1.2. CLI Entry Point (`src/index.ts`) ✅

- [x] Set up `commander` to define the main program.
- [x] Define global options like `--verbose` and `--dry-run`.
- [x] Structure the entry point to register commands using `program.command('name').action(...)`, which will import and execute handlers from the `src/commands/` directory.

#### 1.3. Services Foundation ✅

- **Configuration Service (`src/services/config.service.ts`)** ✅
  - [x] Use `Bun.file()` and `Bun.write()` for fast, atomic file I/O.
  - [x] Implement functions to read, parse, and validate global state and project config files using `zod`.
  - [x] Add package manager detection and project ID generation.
- **Git Service (`src/services/git.service.ts`)** ✅
  - [x] Create a wrapper around `Bun.$` to execute `git` commands and parse their output.
  - [x] Implement worktree management, branch detection, and repository validation.
- **Port Management Service (`src/services/port.service.ts`)** ✅
  - [x] Manage the `portAssignments` section within `~/.grove/state.json`.
  - [x] Implement port conflict detection and cleanup of orphaned assignments.
- **File Service (`src/services/file.service.ts`)** ✅
  - [x] Implement `copyFiles()` using `glob` and `Bun.write(target, Bun.file(source))`.
  - [x] Add project root detection and directory management using Node.js fs APIs.

#### 1.4. Testing & Quality Assurance ✅

- [x] Comprehensive test suite with 61 passing tests covering all services.
- [x] Type safety validation and interface testing.
- [x] Test coverage for ConfigService, GitService, PortService, FileService, and CLI commands.
- [x] Automated pre-commit hooks for linting, formatting, and type checking.

### Phase 2: Core Command Implementation ✅ **COMPLETED**

#### 2.1. `grove init` ✅

- [x] Generate a default `.grove-config.json` with a unique `projectId`.
- [x] Add a corresponding entry for the `projectId` in the global `~/.grove/state.json`.
- [x] Auto-detect `packageManager` by looking for lockfiles.
- [x] Validate git repository and prevent double initialization.
- [x] Support verbose output for detailed initialization info.

#### 2.2. `grove setup` ✅

- [x] Sanitize the feature name into a git-friendly branch name.
- [x] Orchestrate the setup flow using the core services: create worktree, assign port, copy files, run hooks.
- [x] Output only the target directory path to `stdout` for `cd $(...)` compatibility.
- [x] Comprehensive error handling and cleanup on failure.
- [x] Auto-assign next available port from base port.

#### 2.3. `grove list` ✅

- [x] Fetch data from `GitService` and `PortService`.
- [x] Format the data into a clean table using `cli-table3`.
- [x] Support a `--json` flag for scriptable output.
- [x] Display path, branch, port, status (main/feature), and commit info.
- [x] Show relative paths for better readability.

#### 2.4. Testing & Quality Assurance ✅

- [x] All 61 tests passing with 0 failures.
- [x] Full integration test covering complete workflow: `init` → `setup` → `list`.
- [x] TypeScript error handling and proper type safety.
- [x] Clean, atomic commits with conventional commit format.

### Phase 3: Advanced Features & Polish

#### 3.1. `grove merge`

- [ ] Validate the current directory is a worktree.
- [ ] Run `preMerge` hooks (e.g., `bun test`).
- [ ] Orchestrate the merge flow: switch to base, pull latest, merge branch, delete worktree, release port.
- [ ] Run `postMerge` hooks.

#### 3.2. `grove delete`

- [ ] Use `prompts` to ask for user confirmation.
- [ ] Check for uncommitted changes and warn the user.
- [ ] Safely run hooks, remove the worktree, and release its associated port.

#### 3.3. Hook System

- [ ] Create a `HookService` to execute user-defined shell commands from the config using `Bun.$`.
- [ ] Pass contextual info to hooks via environment variables (`GROVE_BRANCH`, `GROVE_PORT`, etc.).

### Phase 4: Distribution and Final Touches

#### 4.1. Build & Installation

- [ ] Configure a `build` script in `package.json`: `bun build ./src/index.ts --compile --outfile grove`.
- [ ] Create a release script to generate binaries for all target platforms.
- [ ] Finalize `scripts/install.sh` to download and install the correct binary from GitHub Releases.

#### 4.2. Shell Completion

- [ ] Leverage `commander`'s built-in support for shell completions.
- [ ] Add a `grove completion <shell>` command that outputs the completion script.
- [ ] The installer script will offer to automatically add the sourcing of this script to the user's shell profile (e.g., `.bashrc`, `.zshrc`).

#### 4.3. Testing ✅ **COMPLETED**

- [x] Write unit tests for all services using `bun:test`. Use `bun:test`'s built-in mocking.
- [x] Write integration tests that execute the compiled binary against a mock git repository.
- [x] Achieve comprehensive test coverage with 61 passing tests.
- [x] Test all core services: ConfigService, GitService, PortService, FileService.
- [x] Validate TypeScript interfaces and CLI command structure.

#### 4.4. Documentation

- [ ] Ensure `README.md` is comprehensive.
- [ ] Rely on `commander`'s excellent, auto-generated help text for all commands.
- [ ] Document the hook system and configuration options thoroughly.
