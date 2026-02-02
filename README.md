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
Grove creates isolated git worktrees for each feature branch, automatically placing them in `../project__worktrees/<branch>` directories. This keeps your main project clean while allowing parallel feature development. Feature names are sanitized for git safety while preserving case.

### Case Sensitivity
Git branch names are case-sensitive. Grove preserves case in branch names, but on case-insensitive filesystems (common on macOS) Git may report `core.ignorecase=true`. If you need branches that differ only by case, use a case-sensitive volume. `grove doctor` reports the current setting.

### File Synchronization
Grove automatically copies essential files (`.env*`, `.vscode/`, etc.) and can symlink shared files to new worktrees, ensuring consistent development environments across all feature branches.

### Hook System
Execute custom commands at key workflow points:
- **postSetup**: Install dependencies in new worktrees
- **preDelete/postDelete**: Custom cleanup or notifications

### Shell Integration
Grove outputs clean paths to stdout, enabling seamless directory changes and tab completion (zsh + bash):
```bash
grove setup "new feature"   # Jump to new worktree (with shell integration)
grove checkout "my-branch"  # Jump to an existing worktree
grove delete -f             # Delete current worktree and return to main
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

### `grove init` (alias: `i`)
Initialize Grove configuration for a git project. Auto-detects your package manager and creates sensible defaults.

### `grove setup <feature>` (alias: `s`)
Create a new worktree for feature development. Sanitizes feature names (case preserved), copies/symlinks files, and runs setup hooks.

### `grove list` (alias: `l`)
Display all worktrees with their branches and status. Supports `--json` output for scripting.

### `grove checkout <target>` (alias: `c`)
Resolve a worktree path (by branch name or full path) for shell checkout. When shell integration is installed, `grove checkout <branch>` will `cd` into the worktree.

### `grove delete [path]` (alias: `d`)
Safely delete a worktree (defaults to current worktree), only if its branch is merged. Deletes the local branch after removing the worktree. Use `--force` to bypass the merge check and force-delete the local branch. With shell integration, `grove delete -f` from inside a worktree returns you to the main worktree.

### `grove prune` (alias: `p`)
Delete all merged worktrees and their local branches. Use `--dry-run` to list candidates and `--force` to skip confirmations.

### `grove doctor` (alias: `dr`)
Check Grove configuration, shell integration, and git settings for common issues.

### `grove shell-setup` (alias: `ss`)
Generate shell integration for automatic directory changing and tab completion (zsh + bash).

### `grove migrate-workmux` (alias: `mw`)
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
