import { join } from "path";
import type { ProjectConfig } from "../types.js";
import type { LogService } from "./log.service.js";

export class HookService {
	private static readonly DEFAULT_INSTALL_HOOKS = new Set([
		"bun install",
		"npm install",
		"pnpm install",
		"yarn install",
	]);

	static async runHook(
		hookName: keyof ProjectConfig["hooks"],
		config: ProjectConfig,
		context: {
			projectPath: string;
			branch?: string;
			worktreePath?: string;
		},
		log?: LogService
	): Promise<void> {
		const hookCommand = config.hooks[hookName];
		if (!hookCommand) {
			log?.verbose(`No ${hookName} hook configured`);
			return;
		}

		const normalizedCommand = hookCommand.trim().replace(/\s+/g, " ");
		const executionPath = context.worktreePath || context.projectPath;
		if (hookName === "postSetup" && HookService.DEFAULT_INSTALL_HOOKS.has(normalizedCommand)) {
			const hasPackageJson = await Bun.file(join(executionPath, "package.json")).exists();
			if (!hasPackageJson) {
				log?.verbose(`Skipping ${hookName} hook: no package.json in ${executionPath}`);
				return;
			}
		}

		const spinner = log?.spinner(`Running ${hookName} hook: ${hookCommand}`);
		log?.verbose(`Executing ${hookName} hook: ${hookCommand}`);

		const env = {
			...process.env,
			GROVE_PROJECT_ID: config.projectId,
			GROVE_PROJECT_NAME: config.project,
			GROVE_PACKAGE_MANAGER: config.packageManager,
			GROVE_PROJECT_PATH: context.projectPath,
			...(context.branch && { GROVE_BRANCH: context.branch }),
			...(context.worktreePath && { GROVE_WORKTREE_PATH: context.worktreePath }),
		};

		try {
			const result = await Bun.$`sh -c "cd ${executionPath} && ${hookCommand}"`.env(env);
			if (result.exitCode !== 0) {
				spinner?.fail();
				throw new Error(`Hook '${hookName}' failed: ${result.stderr.toString()}`);
			}
			
			spinner?.succeed();
			log?.verbose(`Hook '${hookName}' completed successfully`);
		} catch (error) {
			spinner?.fail();
			throw new Error(`Failed to run hook '${hookName}': ${error}`);
		}
	}
}
