# Grove: Git Worktree Manager

A command-line tool that simplifies git worktree management with file copying, symlinks, and dependency management.

## Why Use Grove?

Git worktrees are powerful but managing them manually is tedious:

- **Manual Setup**: Creating worktrees, copying config files, and installing dependencies for each feature branch
- **Context Switching**: Manually navigating between worktrees and remembering their locations
- **Cleanup**: Forgetting to remove worktrees after finishing features

Grove automates all of this, providing a seamless workflow for feature development.

## Quick Start

```bash
# Install Grove (builds and installs to your PATH)
bun run install

# Initialize Grove in your git project
grove init

# Create a new feature worktree
cd $(grove setup "user authentication")

# List all worktrees
grove list
```

## Core Concepts

### Worktree Management
Grove creates isolated git worktrees for each feature branch, automatically placing them in `../project__worktrees/<branch>` directories. This keeps your main project clean while allowing parallel feature development.

### File Synchronization
Grove automatically copies essential files (`.env*`, `.vscode/`, etc.) and can symlink shared files to new worktrees, ensuring consistent development environments across all feature branches.

### Hook System
Execute custom commands at key workflow points:
- **postSetup**: Install dependencies in new worktrees
- **preDelete/postDelete**: Custom cleanup or notifications

### Shell Integration
Grove outputs clean paths to stdout, enabling seamless directory changes:
```bash
cd $(grove setup "new feature")  # Jump to new worktree
```

## Configuration

Grove uses a simple JSON configuration file (`.grove.json`) in your project:

```json
{
  "projectId": "proj_a8b2cde3",
  "project": "myapp", 
  "packageManager": "bun",
  "copyFiles": [".env*", ".vscode/"],
  "symlinkFiles": [".env.local"],
  "hooks": {
    "postSetup": "bun install",
    "preDelete": "bun test"
  }
}
```

## Technical Architecture

### Service-Oriented Design
Grove is built with a clean service architecture:

- **ConfigService**: Manages project configuration
- **GitService**: Handles all git worktree operations
- **FileService**: Copies files, creates symlinks, and manages directories
- **HookService**: Executes user-defined shell commands
- **LogService**: Provides structured logging with progress indicators

### State Management
Grove maintains project data in a single config file:
- **Project Config** (`.grove.json`): User-editable settings committed to git

### Built with Modern Tools
- **Bun**: Ultra-fast JavaScript runtime and toolkit
- **TypeScript**: Type-safe development
- **Commander**: Robust CLI framework
- **Biome**: Fast linting and formatting

### Cross-Platform Binary
Grove compiles to a single, self-contained binary using `bun build --compile`, making distribution and installation simple across all platforms.

## Commands

### `grove init`
Initialize Grove configuration for a git project. Auto-detects your package manager and creates sensible defaults.

### `grove setup <feature>`
Create a new worktree for feature development. Sanitizes feature names, copies/symlinks files, and runs setup hooks.

### `grove list`
Display all worktrees with their branches and status. Supports `--json` output for scripting.

### `grove delete <path>`
Safely delete a worktree with confirmation prompts and cleanup hooks.

### `grove migrate-workmux`
Convert a workmux `.workmux.yaml` into `.grove.json`.

## Example Workflow

```bash
# One-time setup
grove init

# Start a new feature
cd $(grove setup "user dashboard")
# Now in: ../myapp__worktrees/user-dashboard

# Develop your feature
git add . && git commit -m "implement user dashboard"

# Continue with next feature
cd $(grove setup "api integration")
```

Grove handles all the tedious parts—creating worktrees, syncing files, and cleaning up—so you can focus on building features.
