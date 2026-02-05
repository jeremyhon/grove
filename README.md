# Grove

Grove is a CLI that automates day-to-day `git worktree` workflows: create feature worktrees fast, sync project files, and clean up safely when branches are merged.

## Features

- Create feature worktrees in a consistent location: `../<project>__worktrees/<branch>`
- Auto-copy shared local files (for example `.env*`, `.vscode/`)
- Optional symlink support for files you want to share between worktrees
- Run lifecycle hooks (`postSetup`, `preDelete`, `postDelete`)
- Shell integration for auto-`cd` + tab completion (zsh and bash)
- Safe delete and prune with merge checks against your main branch

## Installation

Install from source in this repo:

```bash
bun install
bun run install
```

The install script builds `grove`, copies it to `~/.local/bin/grove`, and runs `grove shell-setup`.

If `grove` is not found, add `~/.local/bin` to your `PATH` and reload your shell.

## Quick Start (2 minutes)

```bash
# 1) In your git repo, initialize Grove
grove init

# 2) Create and jump into a new worktree
grove setup "user authentication"

# 3) See all worktrees
grove list
```

Without shell integration, use:

```bash
cd "$(grove setup 'user authentication')"
```

## Common Workflows

### Start a feature branch

```bash
grove setup "payroll export"
```

This creates a sanitized branch name, creates a worktree, copies/symlinks configured files, runs `postSetup`, and prints the worktree path.

### Jump to an existing worktree

```bash
grove checkout payroll-export
# or
grove checkout ../myapp__worktrees/payroll-export
```

### Delete one worktree

```bash
grove delete payroll-export
```

By default, Grove only deletes if the branch is merged. Use `-f` to skip checks and confirmation.

### Clean up merged worktrees in bulk

```bash
grove prune --dry-run
grove prune
```

### Verify your setup

```bash
grove doctor
```

## Command Reference

| Command | Alias | Description |
| --- | --- | --- |
| `grove init` | `i` | Initialize `.grove.json` in the current git repository |
| `grove setup <feature>` | `s` | Create a worktree and branch for a feature |
| `grove checkout <target>` | `c` | Resolve and print a worktree path (used for shell `cd`) |
| `grove list [--json]` | `l` | List worktrees in table or JSON format |
| `grove delete [path] [-f]` | `d` | Delete one worktree and its local branch |
| `grove prune [--dry-run] [-f]` | `p` | Delete all merged worktrees and local branches |
| `grove doctor` | `dr` | Check shell integration, config, and git settings |
| `grove shell-setup` | `ss` | Install shell wrapper and command completion |
| `grove migrate-workmux` | `mw` | Convert `.workmux.yaml` to `.grove.json` |

Global option: `-v, --verbose` for detailed logs.

## Configuration

Grove stores project settings in `.grove.json` at the main repo root.

```json
{
  "projectId": "proj_a8b2cde3",
  "project": "myapp",
  "packageManager": "bun",
  "copyFiles": [".env*", ".vscode/"],
  "symlinkFiles": [".env.local"],
  "hooks": {
    "postSetup": "bun install",
    "preDelete": "bun test",
    "postDelete": "echo cleaned"
  }
}
```

### Hook environment variables

Grove exposes these variables when running hooks:

- `GROVE_PROJECT_ID`
- `GROVE_PROJECT_NAME`
- `GROVE_PACKAGE_MANAGER`
- `GROVE_PROJECT_PATH`
- `GROVE_BRANCH` (when available)
- `GROVE_WORKTREE_PATH` (when available)

## Architecture

Grove uses a command-orchestrator + service-layer design:

```text
CLI entrypoint (src/index.ts, Commander)
  -> command handlers (src/commands/*.ts)
    -> services (src/services/*.ts)
      -> git + filesystem + shell hooks
```

### Core layers

- `src/index.ts`: registers commands, aliases, options, and lazy-loads command modules
- `src/commands/*`: workflow orchestration for each command (`setup`, `delete`, `prune`, etc.)
- `src/services/config.service.ts`: reads/writes and validates `.grove.json` with Zod
- `src/services/git.service.ts`: all git operations (`worktree add/remove`, merge checks, fetch, prune)
- `src/services/file.service.ts`: glob-based copy/symlink and filesystem helpers
- `src/services/hook.service.ts`: executes configured shell hooks with Grove-specific env vars
- `src/services/log.service.ts`: consistent stderr/stdout logging, verbose logs, and spinners

### Data and state model

- Persistent state is intentionally small: a single project file, `.grove.json`
- Git remains the source of truth for branches, worktrees, and merge status
- Worktrees are discovered from `git worktree list --porcelain` rather than cached metadata

### `setup` flow (high level)

1. Validate git repo + load `.grove.json`
2. Sanitize feature input into a git-safe branch name
3. Fetch remote refs and create a worktree/branch
4. Copy + symlink configured files
5. Run `postSetup` hook
6. Print worktree path for shell integration

### `delete/prune` safety model

- Refuses to delete the main worktree
- Fetches remote and checks branch merge status before delete (unless `--force`)
- Runs hooks around deletion (`preDelete`, `postDelete`)
- Deletes local branches only after worktree removal

## Troubleshooting

### `Grove not initialized`

Run `grove init` in the repo root (where you want `.grove.json`).

### `Current directory is not a git repository`

Run inside a git repo, or initialize one first with `git init`.

### `Branch is not merged`

Merge the feature branch into your main branch (or use `--force` if you explicitly want to bypass safety checks).

### Shell integration is not working

Run:

```bash
grove shell-setup
grove doctor
```

Then reload your shell (`source ~/.zshrc` or the rc file shown by `grove doctor`).
