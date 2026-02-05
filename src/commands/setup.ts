import { join, dirname } from "path";
import { ConfigService } from "../services/config.service.js";
import { GitService } from "../services/git.service.js";
import { FileService } from "../services/file.service.js";
import { HookService } from "../services/hook.service.js";
import { createLogService } from "../services/log.service.js";
import type { CommandOptions } from "../types.js";

export async function setupCommand(feature: string, options: CommandOptions): Promise<void> {
	const log = createLogService({ verbose: options.verbose ?? false });
	const projectPath = process.cwd();
	
	// Check if this is a git repository
	if (!(await GitService.isGitRepository(projectPath))) {
		throw new Error("Current directory is not a git repository.");
	}

	const repoRoot = await GitService.getRepoRoot(projectPath);
	const worktrees = await GitService.getWorktrees(repoRoot);
	const mainWorktree = worktrees.find(worktree => worktree.isMain);
	const configPath = mainWorktree?.path ?? repoRoot;

	// Check if grove is initialized
	const config = await ConfigService.readProjectConfig(configPath);
	if (!config) {
		throw new Error("Grove not initialized. Run 'grove init' first.");
	}
	
	// Sanitize feature name for git branch
	const branchName = GitService.sanitizeBranchName(feature);
	
	// Create target directory path
	const worktreeRoot = join(configPath, `../${config.project}__worktrees`);
	const targetPath = join(worktreeRoot, branchName);
	const targetParent = dirname(targetPath);
	
	// Reuse an existing worktree if present.
	if (await FileService.pathExists(targetPath)) {
		if (!(await GitService.isGitRepository(targetPath))) {
			throw new Error(`Target directory already exists and is not a git repository: ${targetPath}`);
		}
		log.stdout(targetPath);
		log.verbose(`Worktree already exists, reusing: ${targetPath}`);
		return;
	}
	
	try {
		// Sync remote refs before checking branches
		log.verbose("Fetching latest refs from origin");
		await GitService.fetchRemote(configPath);

		// Create worktree
		await FileService.createDirectory(targetParent);
		await GitService.createWorktree(targetPath, branchName, configPath, log);
		
		// Copy files
		if (config.copyFiles.length > 0) {
			await FileService.copyFiles(config.copyFiles, configPath, targetPath);
		}

		// Symlink files
		if (config.symlinkFiles.length > 0) {
			await FileService.symlinkFiles(config.symlinkFiles, configPath, targetPath);
		}
		
		// Run post-setup hook
		await HookService.runHook("postSetup", config, {
			projectPath: configPath,
			branch: branchName,
			worktreePath: targetPath,
		}, log);
		
		// Output target path for cd integration
		log.stdout(targetPath);
		
		log.verbose(`Worktree created: ${feature}`);
		log.verbose(`Branch: ${branchName}`);
		log.verbose(`Path: ${targetPath}`);
		
	} catch (error) {
		// Clean up on failure
		if (await FileService.pathExists(targetPath)) {
			try {
				await GitService.deleteWorktree(targetPath, configPath, log);
			} catch {
				// If git cleanup fails, try filesystem cleanup
				await FileService.deleteDirectory(targetPath);
			}
		}
		throw error;
	}
}
