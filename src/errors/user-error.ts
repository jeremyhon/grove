import { GroveError, GroveErrorCode, type GroveErrorOptions } from "./grove-error.js";

export class UserError extends GroveError {
	constructor(options: Omit<GroveErrorOptions, "exitCode">) {
		super({ ...options, exitCode: 1 });
		this.name = "UserError";
	}

	static alreadyInitialized(projectPath: string): UserError {
		return new UserError({
			code: GroveErrorCode.ALREADY_INITIALIZED,
			message: "Grove is already initialized in this project.",
			suggestion: `Configuration found at ${projectPath}/.grove-config.json. Use 'grove list' to see existing worktrees.`,
		});
	}

	static notInitialized(): UserError {
		return new UserError({
			code: GroveErrorCode.NOT_INITIALIZED,
			message: "Grove not initialized in this project.",
			suggestion: "Run 'grove init' to initialize Grove configuration first.",
		});
	}

	static notGitRepository(): UserError {
		return new UserError({
			code: GroveErrorCode.NOT_GIT_REPOSITORY,
			message: "Current directory is not a git repository.",
			suggestion: "Run 'git init' to initialize a git repository first.",
		});
	}

	static invalidPath(path: string): UserError {
		return new UserError({
			code: GroveErrorCode.INVALID_PATH,
			message: `Path does not exist: ${path}`,
			suggestion: "Check the path and try again. Use 'grove list' to see available worktrees.",
		});
	}

	static uncommittedChanges(path: string): UserError {
		return new UserError({
			code: GroveErrorCode.UNCOMMITTED_CHANGES,
			message: `Worktree has uncommitted changes: ${path}`,
			suggestion: "Commit or stash your changes before merging or deleting the worktree.",
		});
	}

	static cannotDeleteMain(path: string): UserError {
		return new UserError({
			code: GroveErrorCode.CANNOT_DELETE_MAIN,
			message: `Cannot delete the main worktree: ${path}`,
			suggestion: "Use 'grove list' to see feature worktrees that can be deleted.",
		});
	}

	static cannotMergeFromMain(): UserError {
		return new UserError({
			code: GroveErrorCode.CANNOT_MERGE_FROM_MAIN,
			message: "Cannot merge from the main branch.",
			suggestion: "Navigate to a feature worktree before running 'grove merge'.",
		});
	}

	static directoryExists(path: string): UserError {
		return new UserError({
			code: GroveErrorCode.DIRECTORY_EXISTS,
			message: `Target directory already exists: ${path}`,
			suggestion: "Choose a different feature name or delete the existing directory.",
		});
	}

	static invalidFeatureName(feature: string): UserError {
		return new UserError({
			code: GroveErrorCode.INVALID_FEATURE_NAME,
			message: `Invalid feature name: ${feature}`,
			suggestion: "Feature names must be valid git branch names (alphanumeric, hyphens, underscores).",
		});
	}
}