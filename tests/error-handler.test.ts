import { expect, test } from "bun:test";
import { ErrorHandler } from "../src/errors/error-handler.js";
import { GroveErrorCode } from "../src/errors/grove-error.js";

function createHandler() {
	return new ErrorHandler({
		log: {
			error() {},
			info() {},
			verbose() {},
		} as any,
		verbose: false,
	});
}

test("ErrorHandler classifies wrapped delete worktree failures as git errors", () => {
	const handler = createHandler() as any;
	const error = new Error("Failed to delete worktree: fatal: validation failed");

	const normalized = handler.classifyError(error);

	expect(normalized.code).toBe(GroveErrorCode.GIT_OPERATION_FAILED);
	expect(normalized.message).toBe("Git operation failed: delete worktree");
	expect(normalized.suggestion).toContain("Failed to delete worktree: fatal: validation failed");
});

test("ErrorHandler preserves original message for unknown failures", () => {
	const handler = createHandler() as any;
	const error = new Error("Something unexpected broke during cleanup");

	const normalized = handler.classifyError(error);

	expect(normalized.code).toBe(GroveErrorCode.UNKNOWN);
	expect(normalized.message).toBe("Something unexpected broke during cleanup");
	expect(normalized.exitCode).toBe(2);
});
