# Grove: Git Worktree Manager

A command-line tool that simplifies git worktree management with automatic port assignment, file copying, and dependency management.

## Why Use Grove?

Git worktrees are powerful but managing them manually is tedious:

- **Manual Setup**: Creating worktrees, copying config files, and installing dependencies for each feature branch
- **Port Conflicts**: Remembering which ports are used by which worktrees in development
- **Context Switching**: Manually navigating between worktrees and remembering their locations
- **Cleanup**: Forgetting to remove worktrees and release resources after merging features

Grove automates all of this, providing a seamless workflow for feature development.

## Quick Start

```bash
# Install Grove (builds and installs to your PATH)
bun run install

# Initialize Grove in your git project
grove init

# Create a new feature worktree
cd $(grove setup "user authentication")

# Work on your feature, then merge and return to main
cd $(grove merge)

# List all worktrees
grove list
```

## Core Concepts

### Worktree Management
Grove creates isolated git worktrees for each feature branch, automatically placing them in `../project-feature` directories. This keeps your main project clean while allowing parallel feature development.

### Automatic Port Assignment
Each worktree gets a unique port number starting from your base port (default: 3000). Grove tracks port assignments globally, preventing conflicts across all your projects.

### File Synchronization
Grove automatically copies essential files (`.env*`, `.vscode/`, etc.) to new worktrees, ensuring consistent development environments across all feature branches.

### Hook System
Execute custom commands at key workflow points:
- **postSetup**: Install dependencies in new worktrees
- **preMerge**: Run tests before merging
- **postMerge**: Deploy or notify after successful merges
- **preDelete/postDelete**: Custom cleanup or notifications

### Shell Integration
Grove outputs clean paths to stdout, enabling seamless directory changes:
```bash
cd $(grove setup "new feature")  # Jump to new worktree
cd $(grove merge)                # Return to main after merge
```

## Configuration

Grove uses a simple JSON configuration file (`.grove-config.json`) in your project:

```json
{
  "projectId": "proj_a8b2cde3",
  "project": "myapp", 
  "basePort": 3000,
  "packageManager": "bun",
  "copyFiles": [".env*", ".vscode/"],
  "hooks": {
    "postSetup": "bun install",
    "preMerge": "bun test"
  }
}
```

## Technical Architecture

### Service-Oriented Design
Grove is built with a clean service architecture:

- **ConfigService**: Manages project configuration and global state
- **GitService**: Handles all git worktree operations
- **PortService**: Tracks and assigns port numbers across projects
- **FileService**: Copies files and manages directories
- **HookService**: Executes user-defined shell commands
- **LogService**: Provides structured logging with progress indicators

### State Management
Grove maintains two types of data:
- **Project Config** (`.grove-config.json`): User-editable settings committed to git
- **Global State** (`~/.grove/state.json`): Machine-managed runtime data like port assignments

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
Create a new worktree for feature development. Sanitizes feature names, assigns ports, copies files, and runs setup hooks.

### `grove list`
Display all worktrees with their branches, ports, and status. Supports `--json` output for scripting.

### `grove merge`
Merge current feature branch back to main, clean up the worktree, and run merge hooks. Returns you to the main worktree.

### `grove delete <path>`
Safely delete a worktree with confirmation prompts and cleanup hooks. Releases the assigned port for reuse.

## Example Workflow

```bash
# One-time setup
grove init

# Start a new feature
cd $(grove setup "user dashboard")
# Now in: ../myapp-user-dashboard

# Develop your feature
git add . && git commit -m "implement user dashboard"

# Merge and cleanup
cd $(grove merge)
# Back in: ../myapp (main branch)

# Continue with next feature
cd $(grove setup "api integration")
```

Grove handles all the tedious parts—creating worktrees, copying config files, managing ports, and cleaning up—so you can focus on building features.