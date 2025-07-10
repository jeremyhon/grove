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
});