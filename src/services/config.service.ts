import { z } from "zod";
import { join } from "path";
import type { ProjectConfig, PackageManager } from "../types.js";

const ProjectConfigSchema = z.object({
	projectId: z.string(),
	project: z.string(),
	packageManager: z.enum(["bun", "npm", "yarn", "pnpm"]),
	copyFiles: z.array(z.string()),
	symlinkFiles: z.array(z.string()).optional().default([]),
	hooks: z.object({
		postSetup: z.string().optional(),
		preDelete: z.string().optional(),
		postDelete: z.string().optional(),
	}),
});

export class ConfigService {
	private static readonly PROJECT_CONFIG_FILE = ".grove.json";

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
}
