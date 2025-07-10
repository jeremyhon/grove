import prompts from "prompts";
import { resolve } from "path";
import { ConfigService } from "../services/config.service.js";
import { GitService } from "../services/git.service.js";
import { PortService } from "../services/port.service.js";
import { HookService } from "../services/hook.service.js";
import { FileService } from "../services/file.service.js";
import type { CommandOptions } from "../types.js";

export async function deleteCommand(path: string, options: CommandOptions & { force?: boolean }): Promise<void> {
	const targetPath = resolve(path);
	const force = options.force || false;

	try {
		// Validate the target path exists
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

		// Load project config
		const config = await ConfigService.readProjectConfig(mainWorktree.path);
		if (!config) {
			throw new Error("No Grove configuration found. Run 'grove init' first");
		}

		// Check for uncommitted changes
		const isClean = await GitService.isWorktreeClean(targetPath);
		if (!isClean && !force) {
			console.warn("Warning: Worktree has uncommitted changes");
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
				console.log("Delete cancelled");
				return;
			}
		}

		if (options.verbose) {
			console.log(`Deleting worktree at '${targetPath}'`);
		}

		// Run preDelete hook
		await HookService.runHook("preDelete", config, {
			projectPath: mainWorktree.path,
			branch: currentBranch,
			worktreePath: targetPath,
		});

		// Delete the worktree
		await GitService.deleteWorktree(targetPath, mainWorktree.path);

		// Release the port
		await PortService.releasePort(targetPath, config.projectId);

		// Run postDelete hook
		await HookService.runHook("postDelete", config, {
			projectPath: mainWorktree.path,
			branch: currentBranch,
		});

		if (options.verbose) {
			console.log(`Successfully deleted worktree '${targetPath}'`);
		}

		console.log("Worktree deleted successfully");
	} catch (error) {
		if (options.verbose) {
			console.error(`Delete failed: ${error}`);
		}
		throw error;
	}
}