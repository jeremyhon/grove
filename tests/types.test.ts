import { test, expect } from "bun:test";
import type { ProjectConfig, WorktreeInfo, PackageManager, CommandOptions } from "../src/types.js";

test("Types - ProjectConfig interface structure", () => {
	const config: ProjectConfig = {
		projectId: "proj_test123",
		project: "test-project",
		packageManager: "bun",
		copyFiles: [".env*", ".vscode/"],
		symlinkFiles: [".env.local"],
		hooks: {
			postSetup: "bun install",
		},
	};

	expect(config.projectId).toBe("proj_test123");
	expect(config.project).toBe("test-project");
	expect(config.packageManager).toBe("bun");
	expect(config.copyFiles).toEqual([".env*", ".vscode/"]);
	expect(config.symlinkFiles).toEqual([".env.local"]);
	expect(config.hooks.postSetup).toBe("bun install");
});

test("Types - WorktreeInfo interface structure", () => {
	const worktree: WorktreeInfo = {
		path: "/test/worktree",
		branch: "feature-branch",
		head: "abc123def",
		isMain: false,
	};

	expect(worktree.path).toBe("/test/worktree");
	expect(worktree.branch).toBe("feature-branch");
	expect(worktree.head).toBe("abc123def");
	expect(worktree.isMain).toBe(false);
});

test("Types - PackageManager type constraints", () => {
	const managers: PackageManager[] = ["bun", "npm", "yarn", "pnpm"];
	
	managers.forEach(manager => {
		const config: ProjectConfig = {
			projectId: "test",
			project: "test",
			packageManager: manager,
			copyFiles: [],
			symlinkFiles: [],
			hooks: {},
		};
		
		expect(["bun", "npm", "yarn", "pnpm"]).toContain(config.packageManager);
	});
});

test("Types - CommandOptions interface structure", () => {
	const options: CommandOptions = {
		verbose: true,
	};

	expect(options.verbose).toBe(true);
});

test("Types - Optional properties work correctly", () => {
	// ProjectConfig with minimal hooks
	const minimalConfig: ProjectConfig = {
		projectId: "proj_minimal",
		project: "minimal",
		packageManager: "bun",
		copyFiles: [],
		symlinkFiles: [],
		hooks: {}, // All hook properties are optional
	};

	expect(minimalConfig.hooks.postSetup).toBeUndefined();

	// CommandOptions with optional properties
	const minimalOptions: CommandOptions = {};
	expect(minimalOptions.verbose).toBeUndefined();
});
