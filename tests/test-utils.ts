import { mkdir, rm } from "node:fs/promises";
import { join } from "path";
import { initCommand } from "../src/commands/init.js";
import { mock } from "bun:test";

export interface TestRepo {
	path: string;
	originalCwd: string;
	cleanup: () => Promise<void>;
}

const TEST_REPO_NAME = "grove-test-repo";

/**
 * Sets up a clean test repository for Grove testing
 * - Detects if test repo already exists and tears it down
 * - Creates minimal git repository with initial commit
 * - Initializes Grove configuration
 * - Changes to test directory
 */
export async function setupTestRepo(): Promise<TestRepo> {
	const originalCwd = process.cwd();
	const testRepoPath = join(originalCwd, TEST_REPO_NAME);

	// Teardown existing test repo and any worktree directories if they exist
	await teardownTestRepo(testRepoPath, originalCwd);
	
	// Also clean up any potential worktree directories that might exist
	await cleanupWorktreeDirectories(originalCwd);

	// Create fresh test repository
	await mkdir(testRepoPath, { recursive: true });
	process.chdir(testRepoPath);

	// Initialize git repository
	await Bun.$`git init --initial-branch=main`.quiet();
	await Bun.$`git config user.name "Test User"`.quiet();
	await Bun.$`git config user.email "test@example.com"`.quiet();

	// Create minimal files for testing
	await Bun.write("README.md", "# Test Repository\n\nMinimal repository for Grove testing.\n");
	await Bun.write("package.json", JSON.stringify({
		name: "grove-test-repo",
		version: "1.0.0",
		description: "Test repository for Grove",
		main: "index.js",
		scripts: {
			test: "echo \"Error: no test specified\" && exit 1"
		}
	}, null, 2));

	// Initial commit
	await Bun.$`git add .`.quiet();
	await Bun.$`git commit -m "Initial commit"`.quiet();

	// Initialize Grove
	await initCommand({ verbose: false });

	return {
		path: testRepoPath,
		originalCwd,
		cleanup: () => teardownTestRepo(testRepoPath, originalCwd)
	};
}

/**
 * Tears down the test repository and restores original working directory
 */
export async function teardownTestRepo(testRepoPath?: string, originalCwd?: string): Promise<void> {
	const cwd = originalCwd || process.cwd().replace(`/${TEST_REPO_NAME}`, "");
	const repoPath = testRepoPath || join(cwd, TEST_REPO_NAME);

	// Return to original directory
	try {
		process.chdir(cwd);
	} catch {
		// Ignore if directory doesn't exist
	}

	// Remove test repository
	await rm(repoPath, { recursive: true, force: true });

	// Clean up any worktree directories
	await cleanupWorktreeDirectories(cwd);
}

/**
 * Cleans up any worktree directories for the test repo
 */
async function cleanupWorktreeDirectories(basePath: string): Promise<void> {
	try {
		const worktreeRoot = join(basePath, `${TEST_REPO_NAME}__worktrees`);
		await rm(worktreeRoot, { recursive: true, force: true });
	} catch {
		// Ignore find errors - directories might not exist
	}
}

/**
 * Mock services that might cause side effects during testing
 */
export async function mockServices() {
	const { HookService } = await import("../src/services/hook.service.js");
	const originalRunHook = HookService.runHook;
	
	// Mock HookService to prevent actual hook execution
	HookService.runHook = mock(async () => Promise.resolve());
	
	return {
		restore: () => {
			HookService.runHook = originalRunHook;
		}
	};
}
