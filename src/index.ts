#!/usr/bin/env bun

import { Command } from "commander";
import packageJson from "../package.json";
import type { CommandOptions } from "./types.js";

const program = new Command();

program
	.name("grove")
	.description("Git worktree manager with automatic port assignment")
	.version(packageJson.version)
	.option("-v, --verbose", "enable verbose logging")
	.option("--dry-run", "show what would be done without executing");

program
	.command("init")
	.description("Initialize Grove configuration for this project")
	.action(async (options: CommandOptions) => {
		const { initCommand } = await import("./commands/init.js");
		await initCommand(options);
	});

program
	.command("setup")
	.description("Set up a new worktree for a feature branch")
	.argument("<feature>", "feature or branch name")
	.action(async (feature: string, options: CommandOptions) => {
		const { setupCommand } = await import("./commands/setup.js");
		await setupCommand(feature, options);
	});

program
	.command("list")
	.description("List all worktrees and their assigned ports")
	.option("--json", "output as JSON")
	.action(async (options: CommandOptions & { json?: boolean }) => {
		const { listCommand } = await import("./commands/list.js");
		await listCommand(options);
	});

program
	.command("merge")
	.description("Merge current branch and clean up worktree")
	.option("--no-hooks", "skip running hooks")
	.action(async (options: CommandOptions & { hooks?: boolean }) => {
		const { mergeCommand } = await import("./commands/merge.js");
		await mergeCommand(options);
	});

program
	.command("delete")
	.description("Delete a worktree and release its port")
	.argument("<path>", "path to worktree to delete")
	.option("-f, --force", "force deletion without confirmation")
	.action(async (path: string, options: CommandOptions & { force?: boolean }) => {
		const { deleteCommand } = await import("./commands/delete.js");
		await deleteCommand(path, options);
	});

program
	.command("shell-setup")
	.description("Generate shell integration for automatic directory changing")
	.action(async (options: CommandOptions) => {
		const { shellSetupCommand } = await import("./commands/shell-setup.js");
		await shellSetupCommand(options);
	});

program.parse();