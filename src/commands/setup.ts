import { join } from "path";
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
	
	// Check if grove is initialized
	const config = await ConfigService.readProjectConfig(projectPath);
	if (!config) {
		throw new Error("Grove not initialized. Run 'grove init' first.");
	}
	
	// Sanitize feature name for git branch
	const branchName = GitService.sanitizeBranchName(feature);
	
	// Create target directory path
	const worktreeRoot = join(projectPath, `../${config.project}__worktrees`);
	const targetPath = join(worktreeRoot, branchName);
	
	// Check if target directory already exists
	if (await FileService.pathExists(targetPath)) {
		throw new Error(`Target directory already exists: ${targetPath}`);
	}
	
	try {
		// Create worktree
		await FileService.createDirectory(worktreeRoot);
		await GitService.createWorktree(targetPath, branchName, projectPath, log);
		
		// Copy files
		if (config.copyFiles.length > 0) {
			await FileService.copyFiles(config.copyFiles, projectPath, targetPath);
		}

		// Symlink files
		if (config.symlinkFiles.length > 0) {
			await FileService.symlinkFiles(config.symlinkFiles, projectPath, targetPath);
		}
		
		// Run post-setup hook
		await HookService.runHook("postSetup", config, {
			projectPath,
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
				await GitService.deleteWorktree(targetPath, projectPath, log);
			} catch {
				// If git cleanup fails, try filesystem cleanup
				await FileService.deleteDirectory(targetPath);
			}
		}
		throw error;
	}
}
