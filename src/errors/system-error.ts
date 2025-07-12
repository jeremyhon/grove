import { GroveError, GroveErrorCode, type GroveErrorOptions } from "./grove-error.js";

export class SystemError extends GroveError {
	constructor(options: Omit<GroveErrorOptions, "exitCode">) {
		super({ ...options, exitCode: 2 });
		this.name = "SystemError";
	}

	static gitOperationFailed(operation: string, details?: string, cause?: Error): SystemError {
		return new SystemError({
			code: GroveErrorCode.GIT_OPERATION_FAILED,
			message: `Git operation failed: ${operation}`,
			suggestion: details ? `Details: ${details}` : "Check git status and try again.",
			cause,
		});
	}

	static fileOperationFailed(operation: string, path: string, cause?: Error): SystemError {
		return new SystemError({
			code: GroveErrorCode.FILE_OPERATION_FAILED,
			message: `File operation failed: ${operation} on ${path}`,
			suggestion: "Check file permissions and disk space.",
			cause,
		});
	}

	static configReadFailed(path: string, cause?: Error): SystemError {
		return new SystemError({
			code: GroveErrorCode.CONFIG_READ_FAILED,
			message: `Failed to read configuration from ${path}`,
			suggestion: "Check file permissions and ensure the configuration file is valid JSON.",
			cause,
		});
	}

	static configWriteFailed(path: string, cause?: Error): SystemError {
		return new SystemError({
			code: GroveErrorCode.CONFIG_WRITE_FAILED,
			message: `Failed to write configuration to ${path}`,
			suggestion: "Check file permissions and disk space.",
			cause,
		});
	}

	static hookExecutionFailed(hook: string, exitCode: number, stderr?: string): SystemError {
		return new SystemError({
			code: GroveErrorCode.HOOK_EXECUTION_FAILED,
			message: `Hook execution failed: ${hook} (exit code ${exitCode})`,
			suggestion: stderr ? `Error output: ${stderr}` : "Check hook configuration and dependencies.",
		});
	}

	static portAssignmentFailed(reason: string): SystemError {
		return new SystemError({
			code: GroveErrorCode.PORT_ASSIGNMENT_FAILED,
			message: `Port assignment failed: ${reason}`,
			suggestion: "Check global state configuration and port availability.",
		});
	}
}