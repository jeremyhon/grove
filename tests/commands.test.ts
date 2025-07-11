import { test, expect, mock, beforeEach, afterEach } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "path";
import { initCommand } from "../src/commands/init.js";
import { setupCommand } from "../src/commands/setup.js";
import { listCommand } from "../src/commands/list.js";
import { mergeCommand } from "../src/commands/merge.js";
import { deleteCommand } from "../src/commands/delete.js";

// Mock console.log to capture output
const mockConsoleLog = mock(() => {});
const testDir = join(process.cwd(), "test-grove-commands");

beforeEach(async () => {
	console.log = mockConsoleLog;
	mockConsoleLog.mockClear();
	
	// Create test directory
	await mkdir(testDir, { recursive: true });
	process.chdir(testDir);
	
	// Initialize git repo
	await Bun.$`git init --initial-branch=main`.quiet();
	await Bun.$`git config user.name "Test User"`.quiet();
	await Bun.$`git config user.email "test@example.com"`.quiet();
	
	// Create initial commit
	await Bun.write("README.md", "# Test Project");
	await Bun.$`git add .`.quiet();
	await Bun.$`git commit -m "Initial commit"`.quiet();
});

afterEach(async () => {
	process.chdir("/Users/jeremyhon/dev/grove");
	await rm(testDir, { recursive: true, force: true });
	await rm(join(process.env.HOME!, ".grove"), { recursive: true, force: true });
	
	// Clean up any sibling directories created by setup command
	// Pattern: test-grove-commands-*
	const parentDir = join(process.cwd(), "test-grove-commands-test-feature");
	await rm(parentDir, { recursive: true, force: true });
});

test("initCommand - initializes grove configuration", async () => {
	const options = { verbose: true, dryRun: false };
	
	await initCommand(options);
	
	expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("Grove initialized"));
});

test("setupCommand - requires grove initialization", async () => {
	const feature = "new-feature";
	const options = { verbose: false, dryRun: true };
	
	try {
		await setupCommand(feature, options);
		expect.unreachable();
	} catch (error) {
		expect((error as Error).message).toContain("Grove not initialized");
	}
});

test("listCommand - requires grove initialization", async () => {
	const options = { verbose: true, json: true };
	
	try {
		await listCommand(options);
		expect.unreachable();
	} catch (error) {
		expect((error as Error).message).toContain("Grove not initialized");
	}
});

test("mergeCommand - cannot merge from main branch", async () => {
	const options = { verbose: false, hooks: false };
	
	try {
		await mergeCommand(options);
		expect.unreachable();
	} catch (error) {
		expect((error as Error).message).toContain("Cannot merge from main branch");
	}
});

test("mergeCommand - runs postMerge hook when enabled", async () => {
	// Mock HookService early to prevent postSetup hook from failing
	const { HookService } = await import("../src/services/hook.service.js");
	const originalRunHook = HookService.runHook;
	let hookCalled = false;
	let hookName = "";
	
	HookService.runHook = mock(async (name, config, context) => {
		if (name === "postMerge") {
			hookCalled = true;
			hookName = name;
		}
		return Promise.resolve();
	});
	
	try {
		// Initialize grove
		await initCommand({ verbose: false });
		
		// Create a feature worktree
		await setupCommand("test-feature", { verbose: false });
		
		// Move to feature worktree
		const featurePath = join(testDir, "../test-grove-commands-test-feature");
		process.chdir(featurePath);
		
		// Make a commit in the feature branch
		await Bun.write("feature.txt", "Feature file");
		await Bun.$`git add .`.quiet();
		await Bun.$`git commit -m "Add feature"`.quiet();
		
		// Run merge command (this should succeed and call postMerge hook)
		await mergeCommand({ verbose: false, hooks: true });
		
		// Verify the hook was called
		expect(hookCalled).toBe(true);
		expect(hookName).toBe("postMerge");
	} finally {
		// Restore original method
		HookService.runHook = originalRunHook;
	}
});

test("deleteCommand - validates path exists", async () => {
	const path = "/test/worktree/path";
	const options = { verbose: true, force: true };
	
	try {
		await deleteCommand(path, options);
		expect.unreachable();
	} catch (error) {
		expect((error as Error).message).toContain("Path does not exist");
	}
});

test("full workflow - init, setup, list", async () => {
	// Mock HookService to prevent postSetup hook from failing
	const { HookService } = await import("../src/services/hook.service.js");
	const originalRunHook = HookService.runHook;
	HookService.runHook = mock(async () => Promise.resolve());
	
	try {
		// Initialize grove
		await initCommand({ verbose: false });
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("Grove initialized"));
		
		// Setup feature
		mockConsoleLog.mockClear();
		await setupCommand("test-feature", { verbose: false });
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("test-grove-commands-test-feature"));
		
		// List worktrees
		mockConsoleLog.mockClear();
		await listCommand({ verbose: false, json: true });
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("test-feature"));
	} finally {
		// Restore original method
		HookService.runHook = originalRunHook;
	}
});