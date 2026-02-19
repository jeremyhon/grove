import { GitService } from "../services/git.service.js";
import { HookService } from "../services/hook.service.js";
import type { LogService } from "../services/log.service.js";
import type { ProjectConfig } from "../types.js";

interface DeleteWorktreeFlowOptions {
	config: ProjectConfig;
	mainWorktreePath: string;
	worktreePath: string;
	hookBranch: string;
	localBranchToDelete?: string;
	force: boolean;
	log: LogService;
}

export async function deleteWorktreeAndBranch(options: DeleteWorktreeFlowOptions): Promise<void> {
	const {
		config,
		mainWorktreePath,
		worktreePath,
		hookBranch,
		localBranchToDelete,
		force,
		log,
	} = options;

	await HookService.runHook("preDelete", config, {
		projectPath: mainWorktreePath,
		branch: hookBranch,
		worktreePath,
	}, log);

	await GitService.deleteWorktree(worktreePath, {
		basePath: mainWorktreePath,
		log,
		force,
	});

	try {
		await GitService.pruneWorktrees(mainWorktreePath);
	} catch (error) {
		log.warn(`Failed to prune worktrees: ${error}`);
	}

	if (localBranchToDelete) {
		await GitService.deleteLocalBranch(localBranchToDelete, {
			path: mainWorktreePath,
			log,
			force,
		});
	}

	await HookService.runHook("postDelete", config, {
		projectPath: mainWorktreePath,
		branch: hookBranch,
	}, log);
}
