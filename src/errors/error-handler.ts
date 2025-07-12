import { GroveError, GroveErrorCode } from "./grove-error.js";
import { UserError } from "./user-error.js";
import { SystemError } from "./system-error.js";
import type { LogService } from "../services/log.service.js";

export interface ErrorHandlerOptions {
	log: LogService;
	verbose: boolean;
}

export class ErrorHandler {
	private log: LogService;
	private verbose: boolean;

	constructor(options: ErrorHandlerOptions) {
		this.log = options.log;
		this.verbose = options.verbose;
	}

	/**
	 * Handles any error that occurs in Grove commands
	 * Converts unknown errors to GroveErrors and displays user-friendly messages
	 */
	handle(error: unknown): never {
		const groveError = this.normalizeError(error);
		
		// Display the error message
		this.log.error(groveError.message);
		
		// Display suggestion if available
		if (groveError.suggestion) {
			this.log.info(groveError.suggestion);
		}
		
		// Show stack trace in verbose mode
		if (this.verbose && groveError.stack) {
			this.log.verbose(`Stack trace: ${groveError.stack}`);
		}
		
		// Show cause in verbose mode if available
		if (this.verbose && groveError.cause) {
			this.log.verbose(`Caused by: ${groveError.cause.message}`);
			if (groveError.cause.stack) {
				this.log.verbose(`Cause stack: ${groveError.cause.stack}`);
			}
		}
		
		// Exit with appropriate code
		process.exit(groveError.exitCode);
	}

	/**
	 * Converts any error to a GroveError for consistent handling
	 */
	private normalizeError(error: unknown): GroveError {
		if (error instanceof GroveError) {
			return error;
		}
		
		if (error instanceof Error) {
			// Try to classify common error patterns
			return this.classifyError(error);
		}
		
		if (typeof error === "string") {
			return new GroveError({
				code: GroveErrorCode.UNKNOWN,
				message: error,
			});
		}
		
		// Fallback for unknown error types
		return new GroveError({
			code: GroveErrorCode.UNKNOWN,
			message: `An unexpected error occurred: ${String(error)}`,
		});
	}

	/**
	 * Attempts to classify raw Error objects into appropriate GroveError types
	 * based on common error patterns
	 */
	private classifyError(error: Error): GroveError {
		const message = error.message.toLowerCase();
		
		// Git-related errors
		if (message.includes("git") || message.includes("repository")) {
			if (message.includes("not a git repository")) {
				return UserError.notGitRepository();
			}
			return SystemError.gitOperationFailed("unknown git operation", error.message, error);
		}
		
		// File system errors
		if (message.includes("enoent") || message.includes("no such file")) {
			return SystemError.fileOperationFailed("file not found", "unknown path", error);
		}
		
		if (message.includes("eacces") || message.includes("permission denied")) {
			return SystemError.fileOperationFailed("permission denied", "unknown path", error);
		}
		
		if (message.includes("eexist") || message.includes("already exists")) {
			return SystemError.fileOperationFailed("file already exists", "unknown path", error);
		}
		
		// Network/external errors
		if (message.includes("network") || message.includes("timeout") || message.includes("connection")) {
			return new GroveError({
				code: GroveErrorCode.PACKAGE_MANAGER_FAILED,
				message: `Network error: ${error.message}`,
				suggestion: "Check your internet connection and try again.",
				cause: error,
				exitCode: 3,
			});
		}
		
		// Default to system error for unknown Error objects
		return SystemError.fileOperationFailed("unknown operation", "unknown path", error);
	}
}

/**
 * Global error handler instance for convenient use
 */
export function createErrorHandler(options: ErrorHandlerOptions): ErrorHandler {
	return new ErrorHandler(options);
}