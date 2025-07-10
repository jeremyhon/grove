import { test, expect, beforeEach, afterEach, mock } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { PortService } from "../src/services/port.service.js";
import { ConfigService } from "../src/services/config.service.js";
import type { GlobalState } from "../src/types.js";

import { mkdir, rm } from "node:fs/promises";
// Mock the global state directory
const testStateDir = join(tmpdir(), "grove-test-port-state");

beforeEach(async () => {
	// Clean up and mock the global state directory
	await rm(testStateDir, { recursive: true, force: true });
	await mkdir(testStateDir, { recursive: true });
	
	// Mock ConfigService static properties
	(ConfigService as any).GLOBAL_STATE_DIR = testStateDir;
	(ConfigService as any).GLOBAL_STATE_FILE = join(testStateDir, "state.json");
});

afterEach(async () => {
	await rm(testStateDir, { recursive: true, force: true });
});

test("PortService - getNextAvailablePort returns base port for new project", async () => {
	const port = await PortService.getNextAvailablePort("proj_new123", 3000);
	expect(port).toBe(3000);
});

test("PortService - getNextAvailablePort increments for existing assignments", async () => {
	const testState: GlobalState = {
		projects: {
			"proj_test123": {
				basePath: "/test/path",
				portAssignments: {
					"/test/path": 3000,
					"/test/path-feature1": 3001,
				},
			},
		},
	};
	
	await ConfigService.writeGlobalState(testState);
	
	const port = await PortService.getNextAvailablePort("proj_test123", 3000);
	expect(port).toBeGreaterThanOrEqual(3002);
});

test("PortService - assignPort assigns port to worktree", async () => {
	// Initialize project first
	await PortService.initializeProjectPorts("proj_test123", "/test/path", 3000);
	
	await PortService.assignPort("proj_test123", "/test/path-feature", 3001);
	
	const state = await ConfigService.readGlobalState();
	expect(state.projects["proj_test123"]?.portAssignments["/test/path-feature"]).toBe(3001);
});

test("PortService - assignPort throws for non-existent project", async () => {
	await expect(PortService.assignPort("proj_nonexistent", "/test/path", 3000))
		.rejects.toThrow("Project proj_nonexistent not found in global state");
});

test("PortService - releasePort removes port assignment", async () => {
	// Initialize project and assign port
	await PortService.initializeProjectPorts("proj_test123", "/test/path", 3000);
	await PortService.assignPort("proj_test123", "/test/path-feature", 3001);
	
	// Release the port
	await PortService.releasePort("proj_test123", "/test/path-feature");
	
	const state = await ConfigService.readGlobalState();
	expect(state.projects["proj_test123"]?.portAssignments["/test/path-feature"]).toBeUndefined();
});

test("PortService - releasePort handles non-existent project gracefully", async () => {
	// Should not throw
	await PortService.releasePort("proj_nonexistent", "/test/path");
	
	const state = await ConfigService.readGlobalState();
	expect(state.projects["proj_nonexistent"]).toBeUndefined();
});

test("PortService - getAssignedPort returns assigned port", async () => {
	// Initialize project and assign port
	await PortService.initializeProjectPorts("proj_test123", "/test/path", 3000);
	await PortService.assignPort("proj_test123", "/test/path-feature", 3001);
	
	const port = await PortService.getAssignedPort("proj_test123", "/test/path-feature");
	expect(port).toBe(3001);
});

test("PortService - getAssignedPort returns null for non-assigned path", async () => {
	await PortService.initializeProjectPorts("proj_test123", "/test/path", 3000);
	
	const port = await PortService.getAssignedPort("proj_test123", "/test/nonexistent");
	expect(port).toBeNull();
});

test("PortService - getAssignedPort returns null for non-existent project", async () => {
	const port = await PortService.getAssignedPort("proj_nonexistent", "/test/path");
	expect(port).toBeNull();
});

test("PortService - getAllPortAssignments returns all assignments", async () => {
	// Initialize project and assign multiple ports
	await PortService.initializeProjectPorts("proj_test123", "/test/path", 3000);
	await PortService.assignPort("proj_test123", "/test/path-feature1", 3001);
	await PortService.assignPort("proj_test123", "/test/path-feature2", 3002);
	
	const assignments = await PortService.getAllPortAssignments("proj_test123");
	expect(assignments).toEqual({
		"/test/path": 3000,
		"/test/path-feature1": 3001,
		"/test/path-feature2": 3002,
	});
});

test("PortService - getAllPortAssignments returns empty for non-existent project", async () => {
	const assignments = await PortService.getAllPortAssignments("proj_nonexistent");
	expect(assignments).toEqual({});
});

test("PortService - initializeProjectPorts creates project and assigns base port", async () => {
	await PortService.initializeProjectPorts("proj_test123", "/test/path", 3000);
	
	const state = await ConfigService.readGlobalState();
	expect(state.projects["proj_test123"]).toEqual({
		basePath: "/test/path",
		portAssignments: {
			"/test/path": 3000,
		},
	});
});

test("PortService - cleanupOrphanedPorts removes non-existent paths", async () => {
	// Create test directories
	const existingPath = join(tmpdir(), "grove-test-existing");
	await mkdir(existingPath, { recursive: true });
	await Bun.write(join(existingPath, ".keep"), ""); // Ensure it's treated as a directory path
	
	// Initialize project with existing and non-existing paths
	const testState: GlobalState = {
		projects: {
			"proj_test123": {
				basePath: "/test/path",
				portAssignments: {
					[existingPath]: 3000,
					"/non/existent/path": 3001,
				},
			},
		},
	};
	
	await ConfigService.writeGlobalState(testState);
	
	// Clean up orphaned ports
	await PortService.cleanupOrphanedPorts("proj_test123");
	
	const state = await ConfigService.readGlobalState();
	expect(state.projects["proj_test123"]?.portAssignments).toEqual({
		[existingPath]: 3000,
	});
	
	// Clean up
	await rm(existingPath, { recursive: true, force: true });
});

test("PortService - cleanupOrphanedPorts handles non-existent project gracefully", async () => {
	// Should not throw
	await PortService.cleanupOrphanedPorts("proj_nonexistent");
	
	const state = await ConfigService.readGlobalState();
	expect(state.projects["proj_nonexistent"]).toBeUndefined();
});