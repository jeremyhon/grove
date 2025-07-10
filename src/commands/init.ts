import { basename } from "path";
import { ConfigService } from "../services/config.service.js";
import { GitService } from "../services/git.service.js";
import type { CommandOptions, ProjectConfig } from "../types.js";

export async function initCommand(options: CommandOptions): Promise<void> {
	const projectPath = process.cwd();
	
	// Check if this is a git repository
	if (!(await GitService.isGitRepository(projectPath))) {
		throw new Error("Current directory is not a git repository. Run 'git init' first.");
	}
	
	// Check if grove is already initialized
	const existingConfig = await ConfigService.readProjectConfig(projectPath);
	if (existingConfig) {
		throw new Error("Grove is already initialized in this project.");
	}
	
	// Auto-detect package manager
	const packageManager = await ConfigService.detectPackageManager(projectPath);
	
	// Generate project configuration
	const projectName = basename(projectPath);
	const projectId = ConfigService.generateProjectId();
	
	const config: ProjectConfig = {
		projectId,
		project: projectName,
		basePort: 3000,
		packageManager,
		copyFiles: [".env*", ".vscode/"],
		hooks: {
			postSetup: packageManager === "bun" ? "bun install" : `${packageManager} install`,
		},
	};
	
	// Write project config
	await ConfigService.writeProjectConfig(config, projectPath);
	
	// Initialize global state for this project
	const globalState = await ConfigService.readGlobalState();
	globalState.projects[projectId] = {
		basePath: projectPath,
		portAssignments: {
			[projectPath]: config.basePort,
		},
	};
	await ConfigService.writeGlobalState(globalState);
	
	if (options.verbose) {
		console.log(`✅ Grove initialized for project: ${projectName}`);
		console.log(`   Project ID: ${projectId}`);
		console.log(`   Package Manager: ${packageManager}`);
		console.log(`   Base Port: ${config.basePort}`);
	} else {
		console.log(`✅ Grove initialized for ${projectName}`);
	}
}