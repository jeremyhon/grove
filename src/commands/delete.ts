import prompts from "prompts";
import { resolve } from "path";
import { ConfigService } from "../services/config.service.js";
import { GitService } from "../services/git.service.js";
import { HookService } from "../services/hook.service.js";
import { FileService } from "../services/file.service.js";
import { createLogService } from "../services/log.service.js";
import type { CommandOptions } from "../types.js";

export async function deleteCommand(path: string | undefined, options: CommandOptions & { force?: boolean }): Promise<void> {
	const log = createLogService({ verbose: options.verbose ?? false });
	const force = options.force || false;
	const projectPath = process.cwd();

	try {
		let targetPath: string;

		if (!path) {
			if (!(await GitService.isGitRepository(projectPath))) {
				throw new Error("Current directory is not a git repository.");
			}
			targetPath = await GitService.getRepoRoot(projectPath);
		} else {
			// First, try to resolve the path directly
			const resolvedPath = resolve(path);

			if (await FileService.pathExists(resolvedPath)) {
				if (!(await GitService.isGitRepository(resolvedPath))) {
					throw new Error("Target path is not a git repository");
				}
				targetPath = await GitService.getRepoRoot(resolvedPath);
			} else {
				if (!(await GitService.isGitRepository(projectPath))) {
					throw new Error("Current directory is not a git repository.");
				}

				const repoRoot = await GitService.getRepoRoot(projectPath);
				const worktrees = await GitService.getWorktrees(repoRoot);
				const mainWorktree = worktrees.find(worktree => worktree.isMain);
				const configPath = mainWorktree?.path ?? repoRoot;

				// Load project config to get project name
				const config = await ConfigService.readProjectConfig(configPath);
				if (!config) {
					throw new Error("No Grove configuration found. Run 'grove init' first");
				}

				// Try constructing the worktree path using the same pattern as setup
				const possiblePath = resolve(configPath, `../${config.project}__worktrees/${path}`);
				if (await FileService.pathExists(possiblePath)) {
					if (!(await GitService.isGitRepository(possiblePath))) {
						throw new Error("Target path is not a git repository");
					}
					targetPath = await GitService.getRepoRoot(possiblePath);
				} else {
					throw new Error(`Path does not exist: ${path}. Tried both '${resolve(path)}' and '${possiblePath}'`);
				}
			}
		}

		log.verbose(`Resolved target path: ${targetPath}`);

		// Validate the target path exists (this should now always pass)
		if (!(await FileService.pathExists(targetPath))) {
			throw new Error(`Path does not exist: ${targetPath}`);
		}

		// Check if it's a valid git repository
		if (!(await GitService.isGitRepository(targetPath))) {
			throw new Error("Target path is not a git repository");
		}

		// Get current branch
		const currentBranch = await GitService.getCurrentBranch(targetPath);
		if (!currentBranch) {
			throw new Error("Could not determine current branch");
		}

		// Find the main worktree to get config
		const worktrees = await GitService.getWorktrees(targetPath);
		const mainWorktree = worktrees.find(w => w.isMain);
		if (!mainWorktree) {
			throw new Error("Could not find main worktree");
		}

		// Check if we're trying to delete the main worktree
		const mainBranch = await GitService.getMainBranch(targetPath);
		if (currentBranch === mainBranch && targetPath === mainWorktree.path) {
			throw new Error("Cannot delete the main worktree");
		}

		let mergeTarget = mainBranch;
		if (!force) {
			log.verbose("Fetching latest refs from origin");
			await GitService.fetchRemote(mainWorktree.path);

			try {
				const remoteCheck = await Bun.$`git -C ${mainWorktree.path} show-ref --verify --quiet refs/remotes/origin/${mainBranch}`.quiet().nothrow();
				if (remoteCheck.exitCode === 0) {
					mergeTarget = `origin/${mainBranch}`;
				}
			} catch {
				// Ignore remote check errors and fall back to local branch
			}

			const isMerged = await GitService.isBranchMerged(currentBranch, mergeTarget, mainWorktree.path);
			if (!isMerged) {
				log.warn(`Branch '${currentBranch}' is not merged into ${mergeTarget}. Aborting delete.`);
				return;
			}
		}

		// Load project config (we may have already loaded it above for path resolution)
		const config = await ConfigService.readProjectConfig(mainWorktree.path);
		if (!config) {
			throw new Error("No Grove configuration found. Run 'grove init' first");
		}

		// Check for uncommitted changes
		const isClean = await GitService.isWorktreeClean(targetPath);
		if (!isClean && !force) {
			log.warn("Worktree has uncommitted changes");
		}

		// Get confirmation from user unless forced
		if (!force) {
			const response = await prompts({
				type: "confirm",
				name: "confirm",
				message: `Delete worktree at '${targetPath}' and local branch '${currentBranch}'?`,
				initial: false,
			});

			if (!response.confirm) {
				log.info("Delete cancelled");
				return;
			}
		}

		log.verbose(`Deleting worktree at '${targetPath}'`);

		// Run preDelete hook
		await HookService.runHook("preDelete", config, {
			projectPath: mainWorktree.path,
			branch: currentBranch,
			worktreePath: targetPath,
		}, log);

		// Delete the worktree
		await GitService.deleteWorktree(targetPath, mainWorktree.path, log);

		// Prune stale worktree metadata before deleting the branch
		try {
			await GitService.pruneWorktrees(mainWorktree.path);
		} catch (error) {
			log.warn(`Failed to prune worktrees: ${error}`);
		}

		// Delete the local branch (safe since it's merged)
		await GitService.deleteLocalBranch(currentBranch, mainWorktree.path, log, force);

		// Run postDelete hook
		await HookService.runHook("postDelete", config, {
			projectPath: mainWorktree.path,
			branch: currentBranch,
		}, log);

		log.verbose(`Successfully deleted worktree '${targetPath}'`);
		log.success("Worktree deleted successfully");
	} catch (error) {
		log.verbose(`Delete failed: ${error}`);
		throw error;
	}
}
