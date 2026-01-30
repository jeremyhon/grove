import prompts from "prompts";
import { ConfigService } from "../services/config.service.js";
import { GitService } from "../services/git.service.js";
import { HookService } from "../services/hook.service.js";
import { createLogService } from "../services/log.service.js";
import type { CommandOptions } from "../types.js";

export async function pruneCommand(options: CommandOptions & { force?: boolean; dryRun?: boolean }): Promise<void> {
	const log = createLogService({ verbose: options.verbose ?? false });
	const force = options.force || false;
	const dryRun = options.dryRun || false;
	const projectPath = process.cwd();

	if (!(await GitService.isGitRepository(projectPath))) {
		throw new Error("Current directory is not a git repository.");
	}

	const repoRoot = await GitService.getRepoRoot(projectPath);

	// Clean up stale worktree metadata before listing
	try {
		await GitService.pruneWorktrees(repoRoot);
	} catch (error) {
		log.warn(`Failed to prune worktrees: ${error}`);
	}

	const worktrees = await GitService.getWorktrees(repoRoot);
	const mainWorktree = worktrees.find(worktree => worktree.isMain);
	if (!mainWorktree) {
		throw new Error("Could not find main worktree");
	}

	const config = await ConfigService.readProjectConfig(mainWorktree.path);
	if (!config) {
		throw new Error("Grove not initialized. Run 'grove init' first.");
	}

	const mainBranch = await GitService.getMainBranch(repoRoot);
	let mergeTarget = mainBranch;

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

	const candidates = worktrees.filter(worktree => !worktree.isMain);
	const prunable: typeof candidates = [];

	for (const worktree of candidates) {
		if (!worktree.branch) {
			log.warn(`Skipping detached worktree at ${worktree.path}`);
			continue;
		}

		const merged = await GitService.isBranchMerged(worktree.branch, mergeTarget, mainWorktree.path);
		if (!merged) {
			log.verbose(`Skipping unmerged branch '${worktree.branch}' at ${worktree.path}`);
			continue;
		}

		prunable.push(worktree);
	}

	if (prunable.length === 0) {
		log.info("No merged worktrees to prune");
		return;
	}

	if (dryRun) {
		const paths = prunable.map(worktree => worktree.path).join("\n");
		log.stdout(paths);
		return;
	}

	if (!force) {
		const response = await prompts({
			type: "confirm",
			name: "confirm",
			message: `Delete ${prunable.length} merged worktree${prunable.length === 1 ? "" : "s"} and their local branches?`,
			initial: false,
		});

		if (!response.confirm) {
			log.info("Prune cancelled");
			return;
		}
	}

	for (const worktree of prunable) {
		const branch = worktree.branch || "HEAD";

		const isClean = await GitService.isWorktreeClean(worktree.path);
		if (!isClean && !force) {
			log.warn(`Worktree has uncommitted changes: ${worktree.path}`);
		}

		await HookService.runHook("preDelete", config, {
			projectPath: mainWorktree.path,
			branch,
			worktreePath: worktree.path,
		}, log);

		await GitService.deleteWorktree(worktree.path, mainWorktree.path, log);

		try {
			await GitService.pruneWorktrees(mainWorktree.path);
		} catch (error) {
			log.warn(`Failed to prune worktrees: ${error}`);
		}

		if (worktree.branch) {
			await GitService.deleteLocalBranch(worktree.branch, mainWorktree.path, log, force);
		}

		await HookService.runHook("postDelete", config, {
			projectPath: mainWorktree.path,
			branch,
		}, log);
	}

	log.success(`Pruned ${prunable.length} merged worktree${prunable.length === 1 ? "" : "s"}`);
}
