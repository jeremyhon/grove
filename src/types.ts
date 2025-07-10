export interface ProjectConfig {
	projectId: string;
	project: string;
	basePort: number;
	packageManager: "bun" | "npm" | "yarn" | "pnpm";
	copyFiles: string[];
	hooks: {
		postSetup?: string;
		preMerge?: string;
		postMerge?: string;
		preDelete?: string;
		postDelete?: string;
	};
}

export interface GlobalState {
	projects: Record<string, ProjectState>;
}

export interface ProjectState {
	basePath: string;
	portAssignments: Record<string, number>;
}

export interface WorktreeInfo {
	path: string;
	branch: string;
	head: string;
	isMain: boolean;
}

export type PackageManager = "bun" | "npm" | "yarn" | "pnpm";

export interface CommandOptions {
	verbose?: boolean;
	dryRun?: boolean;
}