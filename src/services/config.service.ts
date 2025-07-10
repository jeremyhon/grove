import { z } from "zod";
import { join } from "path";
import { homedir } from "os";
import type { ProjectConfig, GlobalState, PackageManager } from "../types.js";

const ProjectConfigSchema = z.object({
	projectId: z.string(),
	project: z.string(),
	basePort: z.number().min(1024).max(65535),
	packageManager: z.enum(["bun", "npm", "yarn", "pnpm"]),
	copyFiles: z.array(z.string()),
	hooks: z.object({
		postSetup: z.string().optional(),
		preMerge: z.string().optional(),
		postMerge: z.string().optional(),
		preDelete: z.string().optional(),
		postDelete: z.string().optional(),
	}),
});

const GlobalStateSchema = z.object({
	projects: z.record(z.string(), z.object({
		basePath: z.string(),
		portAssignments: z.record(z.string(), z.number()),
	})),
});

export class ConfigService {
	private static readonly PROJECT_CONFIG_FILE = ".grove-config.json";
	private static readonly GLOBAL_STATE_DIR = join(homedir(), ".grove");
	private static readonly GLOBAL_STATE_FILE = join(ConfigService.GLOBAL_STATE_DIR, "state.json");

	static async readProjectConfig(projectPath: string = process.cwd()): Promise<ProjectConfig | null> {
		const configPath = join(projectPath, ConfigService.PROJECT_CONFIG_FILE);
		
		try {
			const file = Bun.file(configPath);
			const exists = await file.exists();
			
			if (!exists) {
				return null;
			}

			const content = await file.json();
			return ProjectConfigSchema.parse(content);
		} catch (error) {
			throw new Error(`Failed to read project config: ${error}`);
		}
	}

	static async writeProjectConfig(config: ProjectConfig, projectPath: string = process.cwd()): Promise<void> {
		const configPath = join(projectPath, ConfigService.PROJECT_CONFIG_FILE);
		
		try {
			const validated = ProjectConfigSchema.parse(config);
			await Bun.write(configPath, JSON.stringify(validated, null, 2));
		} catch (error) {
			throw new Error(`Failed to write project config: ${error}`);
		}
	}

	static async readGlobalState(): Promise<GlobalState> {
		try {
			const file = Bun.file(ConfigService.GLOBAL_STATE_FILE);
			const exists = await file.exists();
			
			if (!exists) {
				return { projects: {} };
			}

			const content = await file.json();
			const parsed = GlobalStateSchema.parse(content);
			return parsed;
		} catch (error) {
			throw new Error(`Failed to read global state: ${error}`);
		}
	}

	static async writeGlobalState(state: GlobalState): Promise<void> {
		try {
			await ConfigService.ensureGlobalStateDir();
			const validated = GlobalStateSchema.parse(state);
			await Bun.write(ConfigService.GLOBAL_STATE_FILE, JSON.stringify(validated, null, 2));
		} catch (error) {
			throw new Error(`Failed to write global state: ${error}`);
		}
	}

	static async detectPackageManager(projectPath: string = process.cwd()): Promise<PackageManager> {
		const lockFiles = [
			{ file: "bun.lockb", manager: "bun" as const },
			{ file: "yarn.lock", manager: "yarn" as const },
			{ file: "pnpm-lock.yaml", manager: "pnpm" as const },
			{ file: "package-lock.json", manager: "npm" as const },
		];

		for (const { file, manager } of lockFiles) {
			const lockPath = join(projectPath, file);
			const exists = await Bun.file(lockPath).exists();
			if (exists) {
				return manager;
			}
		}

		return "bun"; // Default to bun
	}

	static generateProjectId(): string {
		const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
		let result = "proj_";
		for (let i = 0; i < 8; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	static async ensureGlobalStateDir(): Promise<void> {
		try {
			// Create a temporary file to ensure the directory exists
			const tempFile = join(ConfigService.GLOBAL_STATE_DIR, ".tmp");
			await Bun.write(tempFile, "", { createPath: true });
			// Remove the temporary file
			await Bun.$`rm -f ${tempFile}`.quiet();
		} catch (error) {
			throw new Error(`Failed to create global state directory: ${error}`);
		}
	}
}