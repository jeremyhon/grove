import type { ProjectConfig } from "../types.js";
import type { LogService } from "./log.service.js";

export class HookService {
	static async runHook(
		hookName: keyof ProjectConfig["hooks"],
		config: ProjectConfig,
		context: {
			projectPath: string;
			branch?: string;
			port?: number;
			worktreePath?: string;
		},
		log?: LogService
	): Promise<void> {
		const hookCommand = config.hooks[hookName];
		if (!hookCommand) {
			log?.verbose(`No ${hookName} hook configured`);
			return;
		}

		const spinner = log?.spinner(`Running ${hookName} hook: ${hookCommand}`);
		log?.verbose(`Executing ${hookName} hook: ${hookCommand}`);

		const env = {
			...process.env,
			GROVE_PROJECT_ID: config.projectId,
			GROVE_PROJECT_NAME: config.project,
			GROVE_BASE_PORT: config.basePort.toString(),
			GROVE_PACKAGE_MANAGER: config.packageManager,
			GROVE_PROJECT_PATH: context.projectPath,
			...(context.branch && { GROVE_BRANCH: context.branch }),
			...(context.port && { GROVE_PORT: context.port.toString() }),
			...(context.worktreePath && { GROVE_WORKTREE_PATH: context.worktreePath }),
		};

		try {
			const result = await Bun.$`sh -c "cd ${context.worktreePath || context.projectPath} && ${hookCommand}"`.env(env);
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