import { test, expect, beforeEach, afterEach, afterAll, mock } from "bun:test";
import { join } from "path";
import { initCommand } from "../src/commands/init.js";
import { setupCommand } from "../src/commands/setup.js";
import { listCommand } from "../src/commands/list.js";
import { mergeCommand } from "../src/commands/merge.js";
import { deleteCommand } from "../src/commands/delete.js";
import { setupTestRepo, teardownTestRepo, createMockLogService, mockServices, type TestRepo } from "./test-utils.js";

let testRepo: TestRepo;
let mockLogService: ReturnType<typeof createMockLogService>;
let mockedServices: Awaited<ReturnType<typeof mockServices>>;

beforeEach(async () => {
	// Set up clean test repository
	testRepo = await setupTestRepo();
	
	// Set up log service mocking using Bun's mock.module()
	mockLogService = createMockLogService();
	mockLogService.setup();
	
	// Mock other services to prevent side effects
	mockedServices = await mockServices();
});

afterEach(async () => {
	// Restore mocks
	mockLogService.teardown();
	mockedServices.restore();
	
	// Clean up test repository
	await testRepo.cleanup();
});

afterAll(async () => {
	// Final cleanup
	await teardownTestRepo();
});

test("initCommand - initializes grove configuration", async () => {
	// Test repo is already initialized, but we can test re-initialization
	const options = { verbose: true, dryRun: false };
	
	try {
		await initCommand(options);
		expect.unreachable();
	} catch (error) {
		expect((error as Error).message).toContain("Grove is already initialized");
	}
});

test("setupCommand - creates worktree successfully", async () => {
	const feature = "new-feature";
	const options = { verbose: false };
	
	// Should succeed since Grove is already initialized
	await setupCommand(feature, options);
	
	// Verify worktree was created
	const featurePath = join(testRepo.path, "../grove-test-repo-new-feature");
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(true);
});

test("listCommand - lists worktrees successfully", async () => {
	const options = { verbose: false, json: true };
	
	// Should succeed since Grove is already initialized
	await listCommand(options);
	
	// Check that JSON output was logged to stdout
	expect(mockLogService.hasLogCall("stdout", "grove-test-repo")).toBe(true);
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
	let hookCalled = false;
	let hookName = "";
	
	// Override the mocked services to track hook calls
	const { HookService } = await import("../src/services/hook.service.js");
	const originalRunHook = HookService.runHook;
	HookService.runHook = mock(async (name, config, context) => {
		if (name === "postMerge") {
			hookCalled = true;
			hookName = name;
		}
		return Promise.resolve();
	});
	
	try {
		// Create a feature worktree
		await setupCommand("test-feature", { verbose: false });
		
		// Move to feature worktree
		const featurePath = join(testRepo.path, "../grove-test-repo-test-feature");
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
	const path = "non-existent-feature";
	const options = { verbose: false, force: true };
	
	try {
		await deleteCommand(path, options);
		expect.unreachable();
	} catch (error) {
		expect((error as Error).message).toContain("Path does not exist");
	}
});

test("deleteCommand - resolves feature name to worktree path", async () => {
	// Create a feature worktree
	await setupCommand("test-feature", { verbose: false });
	
	// Verify the worktree was created at the expected path
	const featurePath = join(testRepo.path, "../grove-test-repo-test-feature");
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(true);
	
	// Delete using just the feature name with force flag to skip confirmation
	await deleteCommand("test-feature", { verbose: false, force: true });
	
	// Verify the worktree was deleted
	expect(await FileService.pathExists(featurePath)).toBe(false);
});

test("deleteCommand - accepts full worktree path", async () => {
	// Create a feature worktree
	await setupCommand("another-feature", { verbose: false });
	
	// Get the full path to the worktree
	const featurePath = join(testRepo.path, "../grove-test-repo-another-feature");
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(true);
	
	// Delete using the full path with force flag to skip confirmation
	await deleteCommand(featurePath, { verbose: false, force: true });
	
	// Verify the worktree was deleted
	expect(await FileService.pathExists(featurePath)).toBe(false);
});

test("deleteCommand - shows both attempted paths in error message for non-existent feature", async () => {
	try {
		await deleteCommand("non-existent-feature", { verbose: false, force: true });
		expect.unreachable();
	} catch (error) {
		const errorMessage = (error as Error).message;
		expect(errorMessage).toContain("Path does not exist: non-existent-feature");
		expect(errorMessage).toContain("grove-test-repo/non-existent-feature");
		expect(errorMessage).toContain("grove-test-repo-non-existent-feature");
	}
});

test("full workflow - setup, list", async () => {
	// Setup feature
	await setupCommand("test-feature", { verbose: false });
	
	// Verify feature worktree was created
	const featurePath = join(testRepo.path, "../grove-test-repo-test-feature");
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(true);
	
	// List worktrees and verify output
	await listCommand({ verbose: false, json: true });
	expect(mockLogService.hasLogCall("stdout", "test-feature")).toBe(true);
});