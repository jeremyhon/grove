import Table from "cli-table3";
import { relative } from "path";
import { ConfigService } from "../services/config.service.js";
import { GitService } from "../services/git.service.js";
import { createLogService } from "../services/log.service.js";
import type { CommandOptions } from "../types.js";

export async function listCommand(options: CommandOptions & { json?: boolean }): Promise<void> {
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
	
	// Get worktrees
	const worktrees = await GitService.getWorktrees(projectPath);
	
	// Combine data
	const data = worktrees.map(worktree => ({
		path: worktree.path,
		branch: worktree.branch || "HEAD",
		isMain: worktree.isMain || false,
		head: worktree.head?.substring(0, 7) || "unknown",
	}));
	
	// Output in JSON format if requested
	if (options.json) {
		log.stdout(JSON.stringify(data, null, 2));
		return;
	}
	
	// Create table
	const table = new Table({
		head: ["Path", "Branch", "Status", "Commit"],
		colWidths: [44, 20, 8, 10],
	});
	
	// Add rows
	for (const item of data) {
		const relativePath = relative(process.cwd(), item.path) || ".";
		const status = item.isMain ? "main" : "feature";
		
		table.push([
			relativePath,
			item.branch,
			status,
			item.head,
		]);
	}
	
	log.stdout(table.toString());
	
	log.verbose(`Project: ${config.project}`);
	log.verbose(`Package Manager: ${config.packageManager}`);
}
