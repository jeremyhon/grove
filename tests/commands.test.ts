import { test, expect, beforeEach, afterEach, afterAll, mock } from "bun:test";
import { join } from "path";
import { initCommand } from "../src/commands/init.js";
import { setupCommand } from "../src/commands/setup.js";
import { listCommand } from "../src/commands/list.js";
import { deleteCommand } from "../src/commands/delete.js";
import { pruneCommand } from "../src/commands/prune.js";
import { checkoutCommand } from "../src/commands/checkout.js";
import { setupTestRepo, teardownTestRepo, mockServices, type TestRepo } from "./test-utils.js";

let testRepo: TestRepo;
let mockedServices: Awaited<ReturnType<typeof mockServices>>;
let originalStderr: typeof process.stderr.write;
let originalStdout: typeof process.stdout.write;
let stderrOutput: string[];
let stdoutOutput: string[];

beforeEach(async () => {
	// Set up clean test repository
	testRepo = await setupTestRepo();
	
	// Capture stdout/stderr to keep test output clean
	originalStderr = process.stderr.write;
	originalStdout = process.stdout.write;
	stderrOutput = [];
	stdoutOutput = [];

	process.stderr.write = mock((chunk: any) => {
		stderrOutput.push(chunk.toString());
		return true;
	}) as any;

	process.stdout.write = mock((chunk: any) => {
		stdoutOutput.push(chunk.toString());
		return true;
	}) as any;
	
	// Mock other services to prevent side effects
	mockedServices = await mockServices();
});

afterEach(async () => {
	// Restore mocks
	mockedServices.restore();
	process.stderr.write = originalStderr;
	process.stdout.write = originalStdout;
	
	// Clean up test repository
	await testRepo.cleanup();
});

afterAll(async () => {
	// Final cleanup
	await teardownTestRepo();
});

test("initCommand - initializes grove configuration", async () => {
	// Test repo is already initialized, but we can test re-initialization
	const options = { verbose: true };
	
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
	const featurePath = join(testRepo.path, "../grove-test-repo__worktrees/new-feature");
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(true);
});

test("checkoutCommand - resolves worktree path by branch", async () => {
	const feature = "checkout-feature";
	await setupCommand(feature, { verbose: false });

	const featurePath = join(testRepo.path, `../grove-test-repo__worktrees/${feature}`);
	stdoutOutput.length = 0;

	await checkoutCommand(feature, { verbose: false });

	expect(stdoutOutput.join("")).toContain(featurePath);
});

test("listCommand - lists worktrees successfully", async () => {
	const options = { verbose: false, json: true };
	
	// Should succeed since Grove is already initialized
	await listCommand(options);
	
	// Check that JSON output was logged to stdout
	expect(stdoutOutput.join("")).toContain("grove-test-repo");
});

test("listCommand - works from a worktree directory", async () => {
	await setupCommand("list-from-worktree", { verbose: false });

	const featurePath = join(testRepo.path, "../grove-test-repo__worktrees/list-from-worktree");
	const originalCwd = process.cwd();
	stdoutOutput.length = 0;

	process.chdir(featurePath);

	try {
		await listCommand({ verbose: false, json: true });
		expect(stdoutOutput.join("")).toContain("list-from-worktree");
	} finally {
		process.chdir(originalCwd);
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
	const featurePath = join(testRepo.path, "../grove-test-repo__worktrees/test-feature");
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
	const featurePath = join(testRepo.path, "../grove-test-repo__worktrees/another-feature");
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(true);
	
	// Delete using the full path with force flag to skip confirmation
	await deleteCommand(featurePath, { verbose: false, force: true });
	
	// Verify the worktree was deleted
	expect(await FileService.pathExists(featurePath)).toBe(false);
});

test("deleteCommand - force bypasses merge check", async () => {
	// Create a feature worktree without merging
	await setupCommand("force-delete-feature", { verbose: false });

	const featurePath = join(testRepo.path, "../grove-test-repo__worktrees/force-delete-feature");
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(true);

	// Force delete should bypass merge check and remove branch
	await deleteCommand("force-delete-feature", { verbose: false, force: true });

	expect(await FileService.pathExists(featurePath)).toBe(false);

	const branchCheck = await Bun.$`git -C ${testRepo.path} show-ref --verify --quiet refs/heads/force-delete-feature`.quiet().nothrow();
	expect(branchCheck.exitCode).toBeGreaterThan(0);
});

test("pruneCommand - removes merged worktrees", async () => {
	await setupCommand("prune-merged-feature", { verbose: false });

	const featurePath = join(testRepo.path, "../grove-test-repo__worktrees/prune-merged-feature");
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(true);

	await pruneCommand({ verbose: false, force: true });

	expect(await FileService.pathExists(featurePath)).toBe(false);

	const branchCheck = await Bun.$`git -C ${testRepo.path} show-ref --verify --quiet refs/heads/prune-merged-feature`.quiet().nothrow();
	expect(branchCheck.exitCode).toBeGreaterThan(0);
});

test("deleteCommand - shows both attempted paths in error message for non-existent feature", async () => {
	try {
		await deleteCommand("non-existent-feature", { verbose: false, force: true });
		expect.unreachable();
	} catch (error) {
		const errorMessage = (error as Error).message;
		expect(errorMessage).toContain("Path does not exist: non-existent-feature");
		expect(errorMessage).toContain("grove-test-repo/non-existent-feature");
		expect(errorMessage).toContain("grove-test-repo__worktrees/non-existent-feature");
	}
});

test("full workflow - setup, list", async () => {
	// Setup feature
	await setupCommand("test-feature", { verbose: false });
	
	// Verify feature worktree was created
	const featurePath = join(testRepo.path, "../grove-test-repo__worktrees/test-feature");
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(true);
	
	// List worktrees and verify output
	await listCommand({ verbose: false, json: true });
	expect(stdoutOutput.join("")).toContain("test-feature");
});
