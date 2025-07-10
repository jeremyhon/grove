import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { ConfigService } from "../src/services/config.service.js";
import type { ProjectConfig, GlobalState } from "../src/types.js";

import { mkdir, rm } from "node:fs/promises";
// Create a temporary test directory
const testDir = join(tmpdir(), "grove-test-config");
const testStateDir = join(tmpdir(), "grove-test-state");

beforeEach(async () => {
	// Clean up test directories
	await rm(testDir, { recursive: true, force: true });
	await rm(testStateDir, { recursive: true, force: true });
	await mkdir(testDir, { recursive: true });
	await mkdir(testStateDir, { recursive: true });
});

afterEach(async () => {
	// Clean up test directories
	await rm(testDir, { recursive: true, force: true });
	await rm(testStateDir, { recursive: true, force: true });
});

test("ConfigService - generateProjectId creates valid ID", () => {
	const id = ConfigService.generateProjectId();
	expect(id).toMatch(/^proj_[a-z0-9]{8}$/);
});

test("ConfigService - detectPackageManager detects bun", async () => {
	// Create bun.lockb file
	await Bun.write(join(testDir, "bun.lockb"), "");
	
	const manager = await ConfigService.detectPackageManager(testDir);
	expect(manager).toBe("bun");
});

test("ConfigService - detectPackageManager detects yarn", async () => {
	// Create yarn.lock file
	await Bun.write(join(testDir, "yarn.lock"), "");
	
	const manager = await ConfigService.detectPackageManager(testDir);
	expect(manager).toBe("yarn");
});

test("ConfigService - detectPackageManager defaults to bun", async () => {
	// No lock files
	const manager = await ConfigService.detectPackageManager(testDir);
	expect(manager).toBe("bun");
});

test("ConfigService - readProjectConfig returns null for non-existent config", async () => {
	const config = await ConfigService.readProjectConfig(testDir);
	expect(config).toBeNull();
});

test("ConfigService - writeProjectConfig and readProjectConfig", async () => {
	const testConfig: ProjectConfig = {
		projectId: "proj_test123",
		project: "test-project",
		basePort: 3000,
		packageManager: "bun",
		copyFiles: [".env*", ".vscode/"],
		hooks: {
			postSetup: "bun install",
		},
	};

	await ConfigService.writeProjectConfig(testConfig, testDir);
	const readConfig = await ConfigService.readProjectConfig(testDir);
	
	expect(readConfig).toEqual(testConfig);
});

test("ConfigService - readGlobalState returns empty state for non-existent file", async () => {
	// Mock the global state directory
	const originalDir = (ConfigService as any).GLOBAL_STATE_DIR;
	(ConfigService as any).GLOBAL_STATE_DIR = testStateDir;
	(ConfigService as any).GLOBAL_STATE_FILE = join(testStateDir, "state.json");

	const state = await ConfigService.readGlobalState();
	expect(state).toEqual({ projects: {} });

	// Restore
	(ConfigService as any).GLOBAL_STATE_DIR = originalDir;
});

test("ConfigService - writeGlobalState and readGlobalState", async () => {
	// Mock the global state directory
	const originalDir = (ConfigService as any).GLOBAL_STATE_DIR;
	const originalFile = (ConfigService as any).GLOBAL_STATE_FILE;
	(ConfigService as any).GLOBAL_STATE_DIR = testStateDir;
	(ConfigService as any).GLOBAL_STATE_FILE = join(testStateDir, "state.json");

	const testState: GlobalState = {
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

	await ConfigService.writeGlobalState(testState);
	const readState = await ConfigService.readGlobalState();
	
	expect(readState).toEqual(testState);

	// Restore
	(ConfigService as any).GLOBAL_STATE_DIR = originalDir;
	(ConfigService as any).GLOBAL_STATE_FILE = originalFile;
});

test("ConfigService - writeProjectConfig validates schema", async () => {
	const invalidConfig = {
		projectId: "proj_test123",
		project: "test-project",
		basePort: 99999, // Invalid port
		packageManager: "invalid",
		copyFiles: [".env*"],
		hooks: {},
	} as any;

	await expect(ConfigService.writeProjectConfig(invalidConfig, testDir)).rejects.toThrow();
});