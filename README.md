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

## Implementation Plan

### Phase 1: Core Infrastructure & Setup

#### 1.1. Project Initialization

- [ ] Initialize project with `bun init`.
- [ ] Install dependencies: `bun add commander prompts chalk cli-table3 ora glob zod`.
- [ ] Set up Biome for formatting and linting: `bunx @biomejs/biome init`.
- [ ] Configure `biome.json` and add scripts to `package.json` for checking and applying formats/lints.
- [ ] Create the source directory structure.

#### 1.2. CLI Entry Point (`src/index.ts`)

- [ ] Set up `commander` to define the main program.
- [ ] Define global options like `--verbose` and `--dry-run`.
- [ ] Structure the entry point to register commands using `program.command('name').action(...)`, which will import and execute handlers from the `src/commands/` directory.

#### 1.3. Services Foundation

- **Configuration Service (`src/services/config.service.ts`)**
  - [ ] Use `Bun.file()` and `Bun.write()` for fast, atomic file I/O.
  - [ ] Implement functions to read, parse, and validate global state and project config files using `zod`.
- **Git Service (`src/services/git.service.ts`)**
  - [ ] Create a wrapper around `Bun.$` to execute `git` commands and parse their output.
- **Port Management Service (`src/services/port.service.ts`)**
  - [ ] Manage the `portAssignments` section within `~/.grove/state.json`.
  - [ ] Use a library like `detect-port` to verify a port isn't actively in use.
- **File Service (`src/services/file.service.ts`)**
  - [ ] Implement `copyFiles()` using `glob` and `Bun.write(target, Bun.file(source))`.

### Phase 2: Core Command Implementation

#### 2.1. `grove init`

- [ ] Generate a default `.grove-config.json` with a unique `projectId`.
- [ ] Add a corresponding entry for the `projectId` in the global `~/.grove/state.json`.
- [ ] Auto-detect `packageManager` by looking for lockfiles.

#### 2.2. `grove setup`

- [ ] Sanitize the feature name into a git-friendly branch name.
- [ ] Orchestrate the setup flow using the core services: create worktree, assign port, copy files, run hooks.
- [ ] Output only the target directory path to `stdout` for `cd $(...)` compatibility.

#### 2.3. `grove list`

- [ ] Fetch data from `GitService` and `PortService`.
- [ ] Format the data into a clean table using `cli-table3`.
- [ ] Support a `--json` flag for scriptable output.

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

#### 4.3. Testing

- [ ] Write unit tests for all services using `bun:test`. Use `bun:test`'s built-in mocking.
- [ ] Write integration tests that execute the compiled binary against a mock git repository.

#### 4.4. Documentation

- [ ] Ensure `README.md` is comprehensive.
- [ ] Rely on `commander`'s excellent, auto-generated help text for all commands.
- [ ] Document the hook system and configuration options thoroughly.
