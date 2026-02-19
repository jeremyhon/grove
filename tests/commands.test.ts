import { test, expect, beforeEach, afterEach, afterAll, mock } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { initCommand } from "../src/commands/init.js";
import { setupCommand } from "../src/commands/setup.js";
import { listCommand } from "../src/commands/list.js";
import { deleteCommand } from "../src/commands/delete.js";
import { pruneCommand } from "../src/commands/prune.js";
import { checkoutCommand } from "../src/commands/checkout.js";
import { shellSetupCommand } from "../src/commands/shell-setup.js";
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

test("initCommand - no-ops when Grove is already initialized", async () => {
	// Test repo is already initialized and should no-op
	const { ConfigService } = await import("../src/services/config.service.js");
	const initialConfig = await ConfigService.readProjectConfig(testRepo.path);
	expect(initialConfig).not.toBeNull();

	await initCommand({ verbose: false });

	const configAfterNoop = await ConfigService.readProjectConfig(testRepo.path);
	expect(configAfterNoop).toEqual(initialConfig);
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

test("checkoutCommand - with -b creates a missing worktree", async () => {
	const feature = "checkout-create";
	const featurePath = join(testRepo.path, `../grove-test-repo__worktrees/${feature}`);
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(false);

	stdoutOutput.length = 0;
	await checkoutCommand(feature, { verbose: false, create: true });

	expect(await FileService.pathExists(featurePath)).toBe(true);
	expect(stdoutOutput.join("")).toContain(featurePath);
});

test("checkoutCommand - resolves from feature worktree when primary is not on main branch", async () => {
	await setupCommand("checkout-target", { verbose: false });
	await setupCommand("checkout-caller", { verbose: false });

	// Ensure no worktree currently has the default branch checked out.
	await Bun.$`git -C ${testRepo.path} checkout -b primary-feature`.quiet();

	const callerPath = join(testRepo.path, "../grove-test-repo__worktrees/checkout-caller");
	const targetPath = join(testRepo.path, "../grove-test-repo__worktrees/checkout-target");
	const originalCwd = process.cwd();
	stdoutOutput.length = 0;
	process.chdir(callerPath);

	try {
		await checkoutCommand("checkout-target", { verbose: false });
		expect(stdoutOutput.join("")).toContain(targetPath);
	} finally {
		process.chdir(originalCwd);
	}
});

test("checkoutCommand - resolves existing worktree regardless of target casing", async () => {
	const feature = "checkout-case-sensitive";
	await setupCommand(feature, { verbose: false });

	const featurePath = join(testRepo.path, `../grove-test-repo__worktrees/${feature}`);
	stdoutOutput.length = 0;

	await checkoutCommand(feature.toUpperCase(), { verbose: false });

	expect(stdoutOutput.join("")).toContain(featurePath);
});

test("checkoutCommand - suggests -b when no matching worktree exists", async () => {
	const feature = "missing-worktree";

	try {
		await checkoutCommand(feature, { verbose: false });
		expect.unreachable();
	} catch (error) {
		expect((error as Error).message).toContain(`Use 'grove checkout -b ${feature}' to create it.`);
	}
});

test("setupCommand - reuses an existing worktree", async () => {
	const feature = "setup-existing";
	const featurePath = join(testRepo.path, `../grove-test-repo__worktrees/${feature}`);
	const { FileService } = await import("../src/services/file.service.js");

	await setupCommand(feature, { verbose: false });
	expect(await FileService.pathExists(featurePath)).toBe(true);

	stdoutOutput.length = 0;
	await setupCommand(feature, { verbose: false });

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

test("deleteCommand - returns to main worktree when deleting current worktree", async () => {
	await setupCommand("delete-from-worktree", { verbose: false });

	const featurePath = join(testRepo.path, "../grove-test-repo__worktrees/delete-from-worktree");
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(true);

	const originalCwd = process.cwd();
	stdoutOutput.length = 0;
	process.chdir(featurePath);

	try {
		await deleteCommand(undefined, { verbose: false, force: true });
		expect(process.cwd()).toBe(testRepo.path);
		expect(stdoutOutput.join("")).toContain(testRepo.path);
	} finally {
		process.chdir(originalCwd);
	}
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

test("deleteCommand - force deletes dirty worktree", async () => {
	await setupCommand("force-delete-dirty", { verbose: false });

	const featurePath = join(testRepo.path, "../grove-test-repo__worktrees/force-delete-dirty");
	const { FileService } = await import("../src/services/file.service.js");
	expect(await FileService.pathExists(featurePath)).toBe(true);

	await Bun.write(join(featurePath, "untracked.txt"), "dirty");

	await deleteCommand("force-delete-dirty", { verbose: false, force: true });

	expect(await FileService.pathExists(featurePath)).toBe(false);

	const branchCheck = await Bun.$`git -C ${testRepo.path} show-ref --verify --quiet refs/heads/force-delete-dirty`.quiet().nothrow();
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

test("shellSetupCommand - writes bash completion and sources bash_profile", async () => {
	const tempHome = await mkdtemp(join(tmpdir(), "grove-shell-"));
	const originalHome = process.env.HOME;
	const originalShell = process.env.SHELL;
	const bashProfilePath = join(tempHome, ".bash_profile");

	try {
		process.env.HOME = tempHome;
		process.env.SHELL = "/bin/bash";
		await Bun.write(bashProfilePath, "# test\n");

		await shellSetupCommand({ verbose: false });

		const scriptPath = join(tempHome, ".grove", "grove.sh");
		const scriptContent = await Bun.file(scriptPath).text();
		expect(scriptContent).toContain("complete -F _grove_bash grove");
		expect(scriptContent).toContain("doctor:Check Grove setup and environment");
		expect(scriptContent).toContain("_grove_nocase_compgen");
		expect(scriptContent).toContain("_describe -M 'm:{a-zA-Z}={A-Za-z}' 'commands' commands");
		expect(scriptContent).toContain("compadd -M 'm:{a-zA-Z}={A-Za-z}' -- $branches");

		const profileContent = await Bun.file(bashProfilePath).text();
		expect(profileContent).toContain('source "$HOME/.grove/grove.sh"');
	} finally {
		if (originalHome === undefined) {
			delete process.env.HOME;
		} else {
			process.env.HOME = originalHome;
		}
		if (originalShell === undefined) {
			delete process.env.SHELL;
		} else {
			process.env.SHELL = originalShell;
		}
		await rm(tempHome, { recursive: true, force: true });
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
