export interface ProjectConfig {
	projectId: string;
	project: string;
	packageManager: "bun" | "npm" | "yarn" | "pnpm";
	copyFiles: string[];
	symlinkFiles: string[];
	hooks: {
		postSetup?: string;
		preDelete?: string;
		postDelete?: string;
	};
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
}
