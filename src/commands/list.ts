import Table from "cli-table3";
import { ConfigService } from "../services/config.service.js";
import { GitService } from "../services/git.service.js";
import { PortService } from "../services/port.service.js";
import type { CommandOptions } from "../types.js";

export async function listCommand(options: CommandOptions & { json?: boolean }): Promise<void> {
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
	
	// Get port assignments
	const portAssignments = await PortService.getAllPortAssignments(config.projectId);
	
	// Combine data
	const data = worktrees.map(worktree => ({
		path: worktree.path,
		branch: worktree.branch || "HEAD",
		isMain: worktree.isMain || false,
		port: portAssignments[worktree.path] || null,
		head: worktree.head?.substring(0, 7) || "unknown",
	}));
	
	// Output in JSON format if requested
	if (options.json) {
		console.log(JSON.stringify(data, null, 2));
		return;
	}
	
	// Create table
	const table = new Table({
		head: ["Path", "Branch", "Port", "Status", "Commit"],
		colWidths: [40, 20, 8, 8, 10],
	});
	
	// Add rows
	for (const item of data) {
		const relativePath = item.path.replace(process.cwd(), ".");
		const status = item.isMain ? "main" : "feature";
		const port = item.port ? item.port.toString() : "-";
		
		table.push([
			relativePath,
			item.branch,
			port,
			status,
			item.head,
		]);
	}
	
	console.log(table.toString());
	
	if (options.verbose) {
		console.log(`\nProject: ${config.project}`);
		console.log(`Base Port: ${config.basePort}`);
		console.log(`Package Manager: ${config.packageManager}`);
	}
}