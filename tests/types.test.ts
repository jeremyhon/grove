import { test, expect } from "bun:test";
import type { ProjectConfig, GlobalState, WorktreeInfo, PackageManager, CommandOptions } from "../src/types.js";

test("Types - ProjectConfig interface structure", () => {
	const config: ProjectConfig = {
		projectId: "proj_test123",
		project: "test-project",
		basePort: 3000,
		packageManager: "bun",
		copyFiles: [".env*", ".vscode/"],
		hooks: {
			postSetup: "bun install",
			preMerge: "bun test",
		},
	};

	expect(config.projectId).toBe("proj_test123");
	expect(config.project).toBe("test-project");
	expect(config.basePort).toBe(3000);
	expect(config.packageManager).toBe("bun");
	expect(config.copyFiles).toEqual([".env*", ".vscode/"]);
	expect(config.hooks.postSetup).toBe("bun install");
});

test("Types - GlobalState interface structure", () => {
	const state: GlobalState = {
		projects: {
			"proj_test123": {
				basePath: "/test/path",
				portAssignments: {
					"/test/path": 3000,
					"/test/path-feature": 3001,
				},
			},
		},
	};

	expect(state.projects["proj_test123"]?.basePath).toBe("/test/path");
	expect(state.projects["proj_test123"]?.portAssignments["/test/path"]).toBe(3000);
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
			basePort: 3000,
			packageManager: manager,
			copyFiles: [],
			hooks: {},
		};
		
		expect(["bun", "npm", "yarn", "pnpm"]).toContain(config.packageManager);
	});
});

test("Types - CommandOptions interface structure", () => {
	const options: CommandOptions = {
		verbose: true,
		dryRun: false,
	};

	expect(options.verbose).toBe(true);
	expect(options.dryRun).toBe(false);
});

test("Types - Optional properties work correctly", () => {
	// ProjectConfig with minimal hooks
	const minimalConfig: ProjectConfig = {
		projectId: "proj_minimal",
		project: "minimal",
		basePort: 3000,
		packageManager: "bun",
		copyFiles: [],
		hooks: {}, // All hook properties are optional
	};

	expect(minimalConfig.hooks.postSetup).toBeUndefined();
	expect(minimalConfig.hooks.preMerge).toBeUndefined();

	// CommandOptions with optional properties
	const minimalOptions: CommandOptions = {};
	expect(minimalOptions.verbose).toBeUndefined();
	expect(minimalOptions.dryRun).toBeUndefined();
});