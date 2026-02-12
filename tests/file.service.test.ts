import { test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { lstat, mkdir, rm } from "node:fs/promises";
import { FileService } from "../src/services/file.service.js";

// Create temporary test directories
const testSourceDir = join(tmpdir(), "grove-test-source");
const testTargetDir = join(tmpdir(), "grove-test-target");
const testWorkDir = join(tmpdir(), "grove-test-work");

beforeEach(async () => {
	// Clean up and create test directories
	await rm(testSourceDir, { recursive: true, force: true });
	await rm(testTargetDir, { recursive: true, force: true });
	await rm(testWorkDir, { recursive: true, force: true });
	await mkdir(testSourceDir, { recursive: true });
	await mkdir(testTargetDir, { recursive: true });
	await mkdir(testWorkDir, { recursive: true });
});

afterEach(async () => {
	// Clean up test directories
	await rm(testSourceDir, { recursive: true, force: true });
	await rm(testTargetDir, { recursive: true, force: true });
	await rm(testWorkDir, { recursive: true, force: true });
});

test("FileService - pathExists returns true for existing path", async () => {
	await Bun.write(join(testWorkDir, "existing.txt"), "content");
	
	const exists = await FileService.pathExists(join(testWorkDir, "existing.txt"));
	expect(exists).toBe(true);
});

test("FileService - pathExists returns false for non-existing path", async () => {
	const exists = await FileService.pathExists(join(testWorkDir, "nonexistent.txt"));
	expect(exists).toBe(false);
});

test("FileService - copyFiles copies matching files", async () => {
	// Create source files
	await Bun.write(join(testSourceDir, ".env"), "ENV_VAR=value");
	await Bun.write(join(testSourceDir, ".env.local"), "LOCAL_VAR=local");
	await Bun.write(join(testSourceDir, "regular.txt"), "regular content");
	
	// Copy .env* files
	await FileService.copyFiles([".env*"], testSourceDir, testTargetDir);
	
	// Check copied files
	expect(await FileService.pathExists(join(testTargetDir, ".env"))).toBe(true);
	expect(await FileService.pathExists(join(testTargetDir, ".env.local"))).toBe(true);
	expect(await FileService.pathExists(join(testTargetDir, "regular.txt"))).toBe(false);
	
	// Verify content
	const envContent = await Bun.file(join(testTargetDir, ".env")).text();
	expect(envContent).toBe("ENV_VAR=value");
});

test("FileService - copyFiles handles nested directories", async () => {
	// Create nested structure
	await mkdir(join(testSourceDir, ".vscode"), { recursive: true });
	await Bun.write(join(testSourceDir, ".vscode", "settings.json"), '{"setting": "value"}');
	await Bun.write(join(testSourceDir, ".vscode", "launch.json"), '{"launch": "config"}');
	
	// Copy .vscode directory
	await FileService.copyFiles([".vscode/**"], testSourceDir, testTargetDir);
	
	// Check copied files
	expect(await FileService.pathExists(join(testTargetDir, ".vscode", "settings.json"))).toBe(true);
	expect(await FileService.pathExists(join(testTargetDir, ".vscode", "launch.json"))).toBe(true);
});

test("FileService - copyFiles copies directories by name", async () => {
	await mkdir(join(testSourceDir, "node_modules", "pkg"), { recursive: true });
	await Bun.write(join(testSourceDir, "node_modules", "pkg", "index.js"), "console.log('ok')");

	await FileService.copyFiles(["node_modules"], testSourceDir, testTargetDir);

	expect(await FileService.pathExists(join(testTargetDir, "node_modules", "pkg", "index.js"))).toBe(true);
});

test("FileService - copyFiles handles empty patterns gracefully", async () => {
	await FileService.copyFiles([], testSourceDir, testTargetDir);
	// Should not throw
});

test("FileService - symlinkFiles creates symlinks", async () => {
	await Bun.write(join(testSourceDir, ".env.local"), "LOCAL_VAR=local");

	await FileService.symlinkFiles([".env.local"], testSourceDir, testTargetDir);

	const linkedPath = join(testTargetDir, ".env.local");
	const stats = await lstat(linkedPath);
	expect(stats.isSymbolicLink()).toBe(true);

	const content = await Bun.file(linkedPath).text();
	expect(content).toBe("LOCAL_VAR=local");
});

test("FileService - symlinkFiles creates directory symlinks", async () => {
	await mkdir(join(testSourceDir, "node_modules", "pkg"), { recursive: true });
	await Bun.write(join(testSourceDir, "node_modules", "pkg", "index.js"), "console.log('ok')");

	await FileService.symlinkFiles(["node_modules"], testSourceDir, testTargetDir);

	const linkedPath = join(testTargetDir, "node_modules");
	const stats = await lstat(linkedPath);
	expect(stats.isSymbolicLink()).toBe(true);
	expect(await Bun.file(join(linkedPath, "pkg", "index.js")).text()).toBe("console.log('ok')");
});

test("FileService - copyDirectory copies entire directory", async () => {
	// Create source structure
	await Bun.write(join(testSourceDir, "file1.txt"), "content1");
	await Bun.write(join(testSourceDir, "file2.txt"), "content2");
	await mkdir(join(testSourceDir, "subdir"), { recursive: true });
	await Bun.write(join(testSourceDir, "subdir", "file3.txt"), "content3");
	
	// Copy directory
	await FileService.copyDirectory(testSourceDir, testTargetDir);
	
	// Check copied files
	expect(await FileService.pathExists(join(testTargetDir, "file1.txt"))).toBe(true);
	expect(await FileService.pathExists(join(testTargetDir, "file2.txt"))).toBe(true);
	expect(await FileService.pathExists(join(testTargetDir, "subdir", "file3.txt"))).toBe(true);
	
	// Verify content
	const content = await Bun.file(join(testTargetDir, "subdir", "file3.txt")).text();
	expect(content).toBe("content3");
});

test("FileService - createDirectory creates directory", async () => {
	const newDir = join(testWorkDir, "new", "nested", "dir");
	
	await FileService.createDirectory(newDir);
	
	expect(await FileService.isDirectory(newDir)).toBe(true);
});

test("FileService - deleteDirectory removes directory", async () => {
	// Create directory with content
	const dirToDelete = join(testWorkDir, "to-delete");
	await mkdir(join(dirToDelete, "subdir"), { recursive: true });
	await Bun.write(join(dirToDelete, "file.txt"), "content");
	await Bun.write(join(dirToDelete, "subdir", "nested.txt"), "nested");
	
	// Delete directory
	await FileService.deleteDirectory(dirToDelete);
	
	expect(await FileService.pathExists(dirToDelete)).toBe(false);
});

test("FileService - getProjectName reads from package.json", async () => {
	const packageJson = {
		name: "test-project",
		version: "1.0.0",
	};
	
	await Bun.write(join(testWorkDir, "package.json"), JSON.stringify(packageJson, null, 2));
	
	const projectName = await FileService.getProjectName(testWorkDir);
	expect(projectName).toBe("test-project");
});

test("FileService - getProjectName falls back to directory name", async () => {
	// No package.json file
	const projectName = await FileService.getProjectName(testWorkDir);
	expect(projectName).toBe("grove-test-work");
});

test("FileService - getProjectName handles invalid package.json", async () => {
	// Create invalid package.json
	await Bun.write(join(testWorkDir, "package.json"), "invalid json");
	
	const projectName = await FileService.getProjectName(testWorkDir);
	expect(projectName).toBe("grove-test-work");
});

test("FileService - findProjectRoot finds package.json", async () => {
	// Create nested directory structure
	const nestedDir = join(testWorkDir, "src", "components");
	await mkdir(nestedDir, { recursive: true });
	
	// Create package.json at root
	await Bun.write(join(testWorkDir, "package.json"), '{"name": "test"}');
	
	// Check if package.json exists
	const packageExists = await FileService.pathExists(join(testWorkDir, "package.json"));
	expect(packageExists).toBe(true);
	
	const projectRoot = await FileService.findProjectRoot(nestedDir);
	expect(projectRoot).toBe(testWorkDir);
});

test("FileService - findProjectRoot returns null when not found", async () => {
	// Create a directory without git or package.json
	const isolatedDir = join(tmpdir(), "isolated-test");
	await mkdir(isolatedDir, { recursive: true });
	
	const projectRoot = await FileService.findProjectRoot(isolatedDir);
	expect(projectRoot).toBeNull();
	
	await rm(isolatedDir, { recursive: true, force: true });
});

test("FileService - isDirectory detection", async () => {
	// Create a file and directory
	await Bun.write(join(testWorkDir, "file.txt"), "content");
	await mkdir(join(testWorkDir, "directory"), { recursive: true });
	
	const fileIsDir = await FileService.isDirectory(join(testWorkDir, "file.txt"));
	const dirIsDir = await FileService.isDirectory(join(testWorkDir, "directory"));
	
	expect(fileIsDir).toBe(false);
	expect(dirIsDir).toBe(true);
});
