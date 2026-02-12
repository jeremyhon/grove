import { resolve } from "path";
import { ConfigService } from "../services/config.service.js";
import { GitService } from "../services/git.service.js";
import { FileService } from "../services/file.service.js";
import { createLogService } from "../services/log.service.js";
import type { CommandOptions } from "../types.js";
import { setupCommand } from "./setup.js";

export async function checkoutCommand(target: string, options: CommandOptions & { create?: boolean }): Promise<void> {
	const log = createLogService({ verbose: options.verbose ?? false });
	const projectPath = process.cwd();
	const shouldCreate = options.create ?? false;
	const normalizedTarget = target.trim().toLowerCase();

	if (!(await GitService.isGitRepository(projectPath))) {
		throw new Error("Current directory is not a git repository.");
	}

	// First, try to resolve the path directly
	const resolvedPath = resolve(target);
	let targetPath: string;

	if (await FileService.pathExists(resolvedPath)) {
		if (!(await GitService.isGitRepository(resolvedPath))) {
			throw new Error("Target path is not a git repository");
		}
		targetPath = await GitService.getRepoRoot(resolvedPath);
	} else {
		const repoRoot = await GitService.getRepoRoot(projectPath);
		const worktrees = await GitService.getWorktrees(repoRoot);
		const mainWorktree = worktrees.find(worktree => worktree.isMain);
		const configPath = mainWorktree?.path ?? repoRoot;

		const config = await ConfigService.readProjectConfig(configPath);
		if (!config) {
			throw new Error("No Grove configuration found. Run 'grove init' first");
		}

		const possiblePath = resolve(configPath, `../${config.project}__worktrees/${target}`);
		if (await FileService.pathExists(possiblePath)) {
			if (!(await GitService.isGitRepository(possiblePath))) {
				throw new Error("Target path is not a git repository");
			}
			targetPath = await GitService.getRepoRoot(possiblePath);
		} else {
			const caseInsensitiveMatch = worktrees.find(worktree => worktree.branch?.toLowerCase() === normalizedTarget);
			if (caseInsensitiveMatch && (await FileService.pathExists(caseInsensitiveMatch.path))) {
				if (!(await GitService.isGitRepository(caseInsensitiveMatch.path))) {
					throw new Error("Target path is not a git repository");
				}
				targetPath = await GitService.getRepoRoot(caseInsensitiveMatch.path);
				log.verbose(
					`Resolved '${target}' to existing worktree '${caseInsensitiveMatch.branch}' at '${caseInsensitiveMatch.path}'`,
				);
			} else if (shouldCreate) {
				log.verbose(`No existing worktree found for '${target}', creating one`);
				await setupCommand(target, { verbose: options.verbose });
				return;
			} else {
				throw new Error(
					`Path does not exist: ${target}. Tried both '${resolvedPath}' and '${possiblePath}'. ` +
						`Use 'grove checkout -b ${target}' to create it.`,
				);
			}
		}
	}

	log.stdout(targetPath);
	log.verbose(`Checkout target resolved: ${targetPath}`);
}
