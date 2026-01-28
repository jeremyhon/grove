import { basename, resolve } from "path";
import { homedir } from "os";
import YAML from "yaml";
import { ConfigService } from "../services/config.service.js";
import { FileService } from "../services/file.service.js";
import { createLogService } from "../services/log.service.js";
import type { CommandOptions, ProjectConfig } from "../types.js";

type WorkmuxConfig = {
	files?: {
		copy?: string[] | string;
		symlink?: string[] | string;
	};
	post_create?: string[] | string;
	pre_remove?: string[] | string;
	post_remove?: string[] | string;
};

const GLOBAL_PLACEHOLDER = "<global>";

function normalizeList(value?: string[] | string): string[] {
	if (!value) {
		return [];
	}
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === "string");
	}
	if (typeof value === "string") {
		return [value];
	}
	return [];
}

function mergeWithGlobal(local: string[], global: string[] | undefined): string[] {
	if (!local.includes(GLOBAL_PLACEHOLDER)) {
		return local;
	}

	const withoutPlaceholder = local.filter(item => item !== GLOBAL_PLACEHOLDER);
	if (!global || global.length === 0) {
		return withoutPlaceholder;
	}

	return [...global, ...withoutPlaceholder];
}

function joinCommands(commands: string[]): string | undefined {
	if (commands.length === 0) {
		return undefined;
	}

	return commands.join(" && ");
}

export async function migrateWorkmuxCommand(
	options: CommandOptions & {
		workmux?: string;
		global?: string;
		output?: string;
		force?: boolean;
	}
): Promise<void> {
	const log = createLogService({ verbose: options.verbose ?? false });
	const projectPath = process.cwd();
	const workmuxPath = resolve(options.workmux ?? ".workmux.yaml");
	const outputPath = resolve(options.output ?? ".grove.json");
	const defaultOutputPath = resolve(projectPath, ".grove.json");
	const globalPath = resolve(options.global ?? `${homedir()}/.config/workmux/config.yaml`);
	const force = options.force ?? false;

	if (!(await FileService.pathExists(workmuxPath))) {
		throw new Error(`workmux config not found: ${workmuxPath}`);
	}

	if (outputPath !== defaultOutputPath) {
		throw new Error("Only .grove.json output is supported. Omit --output to use the default.");
	}

	if (!force && (await FileService.pathExists(outputPath))) {
		throw new Error(`Output already exists: ${outputPath}. Use --force to overwrite.`);
	}

	const workmuxRaw = await Bun.file(workmuxPath).text();
	const workmuxConfig = (YAML.parse(workmuxRaw) ?? {}) as WorkmuxConfig;

	let globalConfig: WorkmuxConfig | null = null;
	if (await FileService.pathExists(globalPath)) {
		try {
			const globalRaw = await Bun.file(globalPath).text();
			globalConfig = (YAML.parse(globalRaw) ?? {}) as WorkmuxConfig;
		} catch (error) {
			log.warn(`Failed to parse global config at ${globalPath}: ${error}`);
		}
	}

	const globalCopy = normalizeList(globalConfig?.files?.copy);
	const globalSymlink = normalizeList(globalConfig?.files?.symlink);
	const globalPostCreate = normalizeList(globalConfig?.post_create);
	const globalPreRemove = normalizeList(globalConfig?.pre_remove);
	const globalPostRemove = normalizeList(globalConfig?.post_remove);

	const copyFiles = mergeWithGlobal(normalizeList(workmuxConfig.files?.copy), globalCopy);
	const symlinkFiles = mergeWithGlobal(normalizeList(workmuxConfig.files?.symlink), globalSymlink);
	const postCreate = mergeWithGlobal(normalizeList(workmuxConfig.post_create), globalPostCreate);
	const preRemove = mergeWithGlobal(normalizeList(workmuxConfig.pre_remove), globalPreRemove);
	const postRemove = mergeWithGlobal(normalizeList(workmuxConfig.post_remove), globalPostRemove);

	const hooks: ProjectConfig["hooks"] = {};
	const postSetup = joinCommands(postCreate);
	const preDelete = joinCommands(preRemove);
	const postDelete = joinCommands(postRemove);

	if (postSetup) {
		hooks.postSetup = postSetup;
	}
	if (preDelete) {
		hooks.preDelete = preDelete;
	}
	if (postDelete) {
		hooks.postDelete = postDelete;
	}

	const projectName = await FileService.getProjectName(projectPath);
	const config: ProjectConfig = {
		projectId: ConfigService.generateProjectId(),
		project: projectName || basename(projectPath),
		packageManager: await ConfigService.detectPackageManager(projectPath),
		copyFiles,
		symlinkFiles,
		hooks,
	};

	await ConfigService.writeProjectConfig(config, projectPath);

	log.success(`Migrated ${workmuxPath} to ${outputPath}`);
	if (globalConfig) {
		log.verbose(`Included global config: ${globalPath}`);
	}
}
