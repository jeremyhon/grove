import { test, expect, beforeEach, afterEach, mock } from "bun:test";
import { LogService, createLogService } from "../src/services/log.service.js";

let originalStderr: typeof process.stderr.write;
let originalStdout: typeof process.stdout.write;
let stderrOutput: string[];
let stdoutOutput: string[];
let logService: LogService;

beforeEach(() => {
		// Save original stream methods
		originalStderr = process.stderr.write;
		originalStdout = process.stdout.write;
		
		// Initialize output arrays
		stderrOutput = [];
		stdoutOutput = [];
		
		// Mock process streams
		process.stderr.write = mock((chunk: any) => {
			stderrOutput.push(chunk.toString());
			return true;
		}) as any;
		
		process.stdout.write = mock((chunk: any) => {
			stdoutOutput.push(chunk.toString());
			return true;
		}) as any;
		
		// Create log service instance
		logService = createLogService({ verbose: false });
	});

	afterEach(() => {
		// Restore original stream methods
		process.stderr.write = originalStderr;
		process.stdout.write = originalStdout;
	});

	test("log() writes to stderr", () => {
		logService.log("test message");
		
		expect(stderrOutput).toHaveLength(1);
		expect(stderrOutput[0]).toBe("test message\n");
		expect(stdoutOutput).toHaveLength(0);
	});

	test("success() writes to stderr with checkmark", () => {
		logService.success("operation completed");
		
		expect(stderrOutput).toHaveLength(1);
		expect(stderrOutput[0]).toContain("✅");
		expect(stderrOutput[0]).toContain("operation completed");
		expect(stdoutOutput).toHaveLength(0);
	});

	test("error() writes to stderr with X mark", () => {
		logService.error("something failed");
		
		expect(stderrOutput).toHaveLength(1);
		expect(stderrOutput[0]).toContain("❌");
		expect(stderrOutput[0]).toContain("something failed");
		expect(stdoutOutput).toHaveLength(0);
	});

	test("warn() writes to stderr with warning icon", () => {
		logService.warn("this is a warning");
		
		expect(stderrOutput).toHaveLength(1);
		expect(stderrOutput[0]).toContain("⚠️");
		expect(stderrOutput[0]).toContain("this is a warning");
		expect(stdoutOutput).toHaveLength(0);
	});

	test("info() writes to stderr with info icon", () => {
		logService.info("this is info");
		
		expect(stderrOutput).toHaveLength(1);
		expect(stderrOutput[0]).toContain("ℹ️");
		expect(stderrOutput[0]).toContain("this is info");
		expect(stdoutOutput).toHaveLength(0);
	});

	test("stdout() writes to stdout", () => {
		logService.stdout("shell integration path");
		
		expect(stdoutOutput).toHaveLength(1);
		expect(stdoutOutput[0]).toBe("shell integration path\n");
		expect(stderrOutput).toHaveLength(0);
	});

	test("verbose() only writes when verbose mode is enabled", () => {
		// Test with verbose disabled (default)
		logService.verbose("verbose message");
		expect(stderrOutput).toHaveLength(0);
		
		// Test with verbose enabled
		const verboseLogService = createLogService({ verbose: true });
		verboseLogService.verbose("verbose message");
		
		expect(stderrOutput).toHaveLength(1);
		expect(stderrOutput[0]).toContain("verbose message");
	});

	test("debug() only writes when verbose mode is enabled", () => {
		// Test with verbose disabled (default)
		logService.debug("debug message");
		expect(stderrOutput).toHaveLength(0);
		
		// Test with verbose enabled
		const verboseLogService = createLogService({ verbose: true });
		verboseLogService.debug("debug message");
		
		expect(stderrOutput).toHaveLength(1);
		expect(stderrOutput[0]).toContain("🔍");
		expect(stderrOutput[0]).toContain("debug message");
	});

	test("spinner() creates and manages spinners", () => {
		const spinner = logService.spinner("loading...");
		
		// Spinner should be defined (we don't test internal spinning state as it's implementation detail)
		expect(spinner).toBeDefined();
		expect(typeof spinner.start).toBe("function");
		expect(typeof spinner.stop).toBe("function");
		
		// Stop the spinner (should not throw)
		logService.stopSpinner();
	});

	test("multiple log calls work correctly", () => {
		logService.log("first message");
		logService.success("second message");
		logService.error("third message");
		
		expect(stderrOutput).toHaveLength(3);
		expect(stderrOutput[0]).toContain("first message");
		expect(stderrOutput[1]).toContain("✅");
		expect(stderrOutput[1]).toContain("second message");
		expect(stderrOutput[2]).toContain("❌");
		expect(stderrOutput[2]).toContain("third message");
	});

	test("spinner stops before other log operations", () => {
		// Start a spinner
		logService.spinner("loading...");
		
		// Any log operation should stop the spinner and then log
		logService.log("log message");
		
		// Should contain our log message (spinner output may or may not be captured)
		const allOutput = stderrOutput.join('');
		expect(allOutput).toContain("log message");
	});

	test("createLogService factory function works", () => {
		const service1 = createLogService({ verbose: true });
		const service2 = createLogService({ verbose: false });
		
		// Test that they have different verbose settings
		service1.verbose("verbose test");
		expect(stderrOutput).toHaveLength(1);
		
		stderrOutput.length = 0; // Clear output
		
		service2.verbose("verbose test");
		expect(stderrOutput).toHaveLength(0);
	});