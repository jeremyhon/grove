#!/usr/bin/env bun

import { Command } from "commander";
import packageJson from "../package.json";
import type { CommandOptions } from "./types.js";
import { createErrorHandler } from "./errors/index.js";
import { createLogService } from "./services/log.service.js";

const program = new Command();

/**
 * Wraps command execution with error handling
 */
async function executeCommand(command: () => Promise<void>, options: CommandOptions): Promise<void> {
	const log = createLogService({ verbose: options.verbose ?? false });
	const errorHandler = createErrorHandler({ log, verbose: options.verbose ?? false });
	
	try {
		await command();
	} catch (error) {
		errorHandler.handle(error);
	}
}

program
	.name("grove")
	.description("Git worktree manager with file syncing and hooks")
	.version(packageJson.version)
	.option("-v, --verbose", "enable verbose logging");

program
	.command("init")
	.alias("i")
	.description("Initialize Grove configuration for this project")
	.action(async (options: CommandOptions) => {
		await executeCommand(async () => {
			const { initCommand } = await import("./commands/init.js");
			await initCommand(options);
		}, options);
	});

program
	.command("setup")
	.alias("s")
	.description("Set up a new worktree for a feature branch")
	.argument("<feature>", "feature or branch name")
	.action(async (feature: string, options: CommandOptions) => {
		await executeCommand(async () => {
			const { setupCommand } = await import("./commands/setup.js");
			await setupCommand(feature, options);
		}, options);
	});

program
	.command("checkout")
	.alias("c")
	.description("Resolve a worktree path for shell checkout")
	.argument("<target>", "worktree path or branch name")
	.option("-b, --create", "create the worktree when target branch is missing locally")
	.action(async (target: string, options: CommandOptions & { create?: boolean }) => {
		const { checkoutCommand } = await import("./commands/checkout.js");
		await checkoutCommand(target, options);
	});

program
	.command("list")
	.alias("l")
	.description("List all worktrees and their status")
	.option("--json", "output as JSON")
	.action(async (options: CommandOptions & { json?: boolean }) => {
		await executeCommand(async () => {
			const { listCommand } = await import("./commands/list.js");
			await listCommand(options);
		}, options);
	});

program
	.command("delete")
	.alias("d")
	.description("Delete a worktree")
	.argument("[path]", "path to worktree to delete (defaults to current worktree)")
	.option("-f, --force", "force deletion without confirmation")
	.action(async (path: string | undefined, options: CommandOptions & { force?: boolean }) => {
		await executeCommand(async () => {
			const { deleteCommand } = await import("./commands/delete.js");
			await deleteCommand(path, options);
		}, options);
	});

program
	.command("prune")
	.alias("p")
	.description("Delete merged worktrees and their local branches")
	.option("-f, --force", "force deletion without confirmation")
	.option("--dry-run", "list merged worktrees without deleting")
	.action(async (options: CommandOptions & { force?: boolean; dryRun?: boolean }) => {
		const { pruneCommand } = await import("./commands/prune.js");
		await pruneCommand(options);
	});

program
	.command("doctor")
	.alias("dr")
	.description("Check Grove setup and environment")
	.action(async (options: CommandOptions) => {
		const { doctorCommand } = await import("./commands/doctor.js");
		await doctorCommand(options);
	});

program
	.command("shell-setup")
	.alias("ss")
	.description("Generate shell integration for automatic directory changing")
	.action(async (options: CommandOptions) => {
		await executeCommand(async () => {
			const { shellSetupCommand } = await import("./commands/shell-setup.js");
			await shellSetupCommand(options);
		}, options);
	});

program
	.command("migrate-workmux")
	.alias("mw")
	.description("Migrate workmux YAML config to Grove JSON")
	.option("-w, --workmux <path>", "path to .workmux.yaml")
	.option("-g, --global <path>", "path to global workmux config")
	.option("-o, --output <path>", "output path (default: .grove.json)")
	.option("-f, --force", "overwrite existing .grove.json")
	.action(async (options: CommandOptions & { workmux?: string; global?: string; output?: string; force?: boolean }) => {
		const { migrateWorkmuxCommand } = await import("./commands/migrate-workmux.js");
		await migrateWorkmuxCommand(options);
	});

program.parse();
