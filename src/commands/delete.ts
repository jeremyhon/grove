import prompts from "prompts";
import { resolve } from "path";
import { ConfigService } from "../services/config.service.js";
import { GitService } from "../services/git.service.js";
import { HookService } from "../services/hook.service.js";
import { FileService } from "../services/file.service.js";
import { createLogService } from "../services/log.service.js";
import type { CommandOptions } from "../types.js";

export async function deleteCommand(path: string, options: CommandOptions & { force?: boolean }): Promise<void> {
	const log = createLogService({ verbose: options.verbose ?? false });
	const force = options.force || false;
	const projectPath = process.cwd();

	try {
		// First, try to resolve the path directly
		let targetPath = resolve(path);
		
		// If the direct path doesn't exist, try to construct the worktree path
		if (!(await FileService.pathExists(targetPath))) {
			// Load project config to get project name
			const config = await ConfigService.readProjectConfig(projectPath);
			if (!config) {
				throw new Error("No Grove configuration found. Run 'grove init' first");
			}
			
			// Try constructing the worktree path using the same pattern as setup
			const possiblePath = resolve(projectPath, `../${config.project}__worktrees/${path}`);
			if (await FileService.pathExists(possiblePath)) {
				targetPath = possiblePath;
			} else {
				throw new Error(`Path does not exist: ${path}. Tried both '${resolve(path)}' and '${possiblePath}'`);
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
				message: `Delete worktree at '${targetPath}' (branch: ${currentBranch})?`,
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
