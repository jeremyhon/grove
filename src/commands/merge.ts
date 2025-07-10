import { ConfigService } from "../services/config.service.js";
import { GitService } from "../services/git.service.js";
import { PortService } from "../services/port.service.js";
import { HookService } from "../services/hook.service.js";
import type { CommandOptions } from "../types.js";

export async function mergeCommand(options: CommandOptions & { hooks?: boolean }): Promise<void> {
	const currentPath = process.cwd();
	const runHooks = options.hooks !== false;

	try {
		// Validate we're in a git repository
		if (!(await GitService.isGitRepository(currentPath))) {
			throw new Error("Current directory is not a git repository");
		}

		// Get current branch
		const currentBranch = await GitService.getCurrentBranch(currentPath);
		if (!currentBranch) {
			throw new Error("Could not determine current branch");
		}

		// Find the main worktree (base project path)
		const worktrees = await GitService.getWorktrees(currentPath);
		const mainWorktree = worktrees.find(w => w.isMain);
		if (!mainWorktree) {
			throw new Error("Could not find main worktree");
		}

		// Check if we're already in the main branch
		const mainBranch = await GitService.getMainBranch(currentPath);
		if (currentBranch === mainBranch) {
			throw new Error("Cannot merge from main branch");
		}

		// Load project config
		const config = await ConfigService.readProjectConfig(mainWorktree.path);
		if (!config) {
			throw new Error("No Grove configuration found. Run 'grove init' first");
		}

		// Check for uncommitted changes
		const isClean = await GitService.isWorktreeClean(currentPath);
		if (!isClean) {
			throw new Error("Worktree has uncommitted changes. Please commit or stash them first");
		}

		if (options.verbose) {
			console.log(`Merging branch '${currentBranch}' into '${mainBranch}'`);
		}

		// Run preMerge hook
		if (runHooks) {
			await HookService.runHook("preMerge", config, {
				projectPath: mainWorktree.path,
				branch: currentBranch,
				worktreePath: currentPath,
			});
		}

		// Switch to main branch in main worktree
		await GitService.switchToMainBranch(mainWorktree.path);

		// Pull latest changes
		await GitService.pullLatest(mainWorktree.path);

		// Merge the feature branch
		await GitService.mergeBranch(currentBranch, mainWorktree.path);

		// Clean up: remove the worktree
		await GitService.deleteWorktree(currentPath, mainWorktree.path);

		// Release the port
		await PortService.releasePort(currentPath, config.projectId);

		// Run postMerge hook
		if (runHooks) {
			await HookService.runHook("postMerge", config, {
				projectPath: mainWorktree.path,
				branch: currentBranch,
			});
		}

		if (options.verbose) {
			console.log(`Successfully merged '${currentBranch}' and cleaned up worktree`);
		}

		// Output the main worktree path for shell integration
		console.log(mainWorktree.path);
	} catch (error) {
		if (options.verbose) {
			console.error(`Merge failed: ${error}`);
		}
		throw error;
	}
}