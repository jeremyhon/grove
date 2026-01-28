import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { ConfigService } from "../src/services/config.service.js";
import type { ProjectConfig } from "../src/types.js";

import { mkdir, rm } from "node:fs/promises";
// Create a temporary test directory
const testDir = join(tmpdir(), "grove-test-config");

beforeEach(async () => {
	// Clean up test directories
	await rm(testDir, { recursive: true, force: true });
	await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
	// Clean up test directories
	await rm(testDir, { recursive: true, force: true });
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
		packageManager: "bun",
		copyFiles: [".env*", ".vscode/"],
		symlinkFiles: [".env.local"],
		hooks: {
			postSetup: "bun install",
		},
	};

	await ConfigService.writeProjectConfig(testConfig, testDir);
	const readConfig = await ConfigService.readProjectConfig(testDir);
	
	expect(readConfig).toEqual(testConfig);
});

test("ConfigService - writeProjectConfig validates schema", async () => {
	const invalidConfig = {
		projectId: "proj_test123",
		project: "test-project",
		packageManager: "invalid",
		copyFiles: [".env*"],
		symlinkFiles: [],
		hooks: {},
	} as any;

	await expect(ConfigService.writeProjectConfig(invalidConfig, testDir)).rejects.toThrow();
});
