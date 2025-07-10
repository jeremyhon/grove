import { test, expect, mock, beforeEach } from "bun:test";
import { initCommand } from "../src/commands/init.js";
import { setupCommand } from "../src/commands/setup.js";
import { listCommand } from "../src/commands/list.js";
import { mergeCommand } from "../src/commands/merge.js";
import { deleteCommand } from "../src/commands/delete.js";

// Mock console.log to capture output
const mockConsoleLog = mock(() => {});

beforeEach(() => {
	console.log = mockConsoleLog;
	mockConsoleLog.mockClear();
});

test("initCommand - calls with options", async () => {
	const options = { verbose: true, dryRun: false };
	
	await initCommand(options);
	
	expect(mockConsoleLog).toHaveBeenCalledWith("Init command not implemented yet");
	expect(mockConsoleLog).toHaveBeenCalledWith("Options:", options);
});

test("setupCommand - calls with feature and options", async () => {
	const feature = "new-feature";
	const options = { verbose: false, dryRun: true };
	
	await setupCommand(feature, options);
	
	expect(mockConsoleLog).toHaveBeenCalledWith("Setup command not implemented yet");
	expect(mockConsoleLog).toHaveBeenCalledWith("Feature:", feature);
	expect(mockConsoleLog).toHaveBeenCalledWith("Options:", options);
});

test("listCommand - calls with options including json flag", async () => {
	const options = { verbose: true, json: true };
	
	await listCommand(options);
	
	expect(mockConsoleLog).toHaveBeenCalledWith("List command not implemented yet");
	expect(mockConsoleLog).toHaveBeenCalledWith("Options:", options);
});

test("mergeCommand - calls with options including hooks flag", async () => {
	const options = { verbose: false, hooks: false };
	
	await mergeCommand(options);
	
	expect(mockConsoleLog).toHaveBeenCalledWith("Merge command not implemented yet");
	expect(mockConsoleLog).toHaveBeenCalledWith("Options:", options);
});

test("deleteCommand - calls with path and options including force flag", async () => {
	const path = "/test/worktree/path";
	const options = { verbose: true, force: true };
	
	await deleteCommand(path, options);
	
	expect(mockConsoleLog).toHaveBeenCalledWith("Delete command not implemented yet");
	expect(mockConsoleLog).toHaveBeenCalledWith("Path:", path);
	expect(mockConsoleLog).toHaveBeenCalledWith("Options:", options);
});

test("commands handle empty options", async () => {
	const emptyOptions = {};
	
	await initCommand(emptyOptions);
	await setupCommand("test-feature", emptyOptions);
	await listCommand(emptyOptions);
	await mergeCommand(emptyOptions);
	await deleteCommand("/test/path", emptyOptions);
	
	// Should not throw and should call console.log multiple times
	expect(mockConsoleLog).toHaveBeenCalled();
});