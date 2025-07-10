import { join } from "path";
import { ConfigService } from "../services/config.service.js";
import { GitService } from "../services/git.service.js";
import { PortService } from "../services/port.service.js";
import { FileService } from "../services/file.service.js";
import type { CommandOptions } from "../types.js";

export async function setupCommand(feature: string, options: CommandOptions): Promise<void> {
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
	const targetPath = join(projectPath, `../${config.project}-${branchName}`);
	
	// Check if target directory already exists
	if (await FileService.pathExists(targetPath)) {
		throw new Error(`Target directory already exists: ${targetPath}`);
	}
	
	try {
		// Create worktree
		await GitService.createWorktree(targetPath, branchName, projectPath);
		
		// Get next available port
		const port = await PortService.getNextAvailablePort(config.projectId, config.basePort);
		
		// Assign port to worktree
		await PortService.assignPort(config.projectId, targetPath, port);
		
		// Copy files
		if (config.copyFiles.length > 0) {
			await FileService.copyFiles(config.copyFiles, projectPath, targetPath);
		}
		
		// Run post-setup hook
		if (config.hooks.postSetup) {
			if (options.verbose) {
				console.log(`Running post-setup hook: ${config.hooks.postSetup}`);
			}
			
			try {
				await Bun.$`cd ${targetPath} && ${config.hooks.postSetup}`.quiet();
			} catch (error) {
				if (options.verbose) {
					console.warn(`Post-setup hook failed: ${error}`);
				}
			}
		}
		
		// Clean up orphaned ports
		await PortService.cleanupOrphanedPorts(config.projectId);
		
		// Output target path for cd integration
		console.log(targetPath);
		
		if (options.verbose) {
			console.log(`✅ Worktree created: ${feature}`);
			console.log(`   Branch: ${branchName}`);
			console.log(`   Port: ${port}`);
			console.log(`   Path: ${targetPath}`);
		}
		
	} catch (error) {
		// Clean up on failure
		if (await FileService.pathExists(targetPath)) {
			try {
				await GitService.deleteWorktree(targetPath, projectPath);
			} catch {
				// If git cleanup fails, try filesystem cleanup
				await FileService.deleteDirectory(targetPath);
			}
		}
		throw error;
	}
}