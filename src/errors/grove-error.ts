export enum GroveErrorCode {
	// User errors (1xx)
	ALREADY_INITIALIZED = "G101",
	NOT_INITIALIZED = "G102",
	NOT_GIT_REPOSITORY = "G103",
	INVALID_PATH = "G104",
	UNCOMMITTED_CHANGES = "G105",
	CANNOT_DELETE_MAIN = "G106",
	CANNOT_MERGE_FROM_MAIN = "G107",
	DIRECTORY_EXISTS = "G108",
	INVALID_FEATURE_NAME = "G109",
	MERGE_CONFLICTS = "G110",
	
	// System errors (2xx)
	GIT_OPERATION_FAILED = "G201",
	FILE_OPERATION_FAILED = "G202",
	CONFIG_READ_FAILED = "G203",
	CONFIG_WRITE_FAILED = "G204",
	HOOK_EXECUTION_FAILED = "G205",
	PORT_ASSIGNMENT_FAILED = "G206",
	
	// Network/External errors (3xx)
	PACKAGE_MANAGER_FAILED = "G301",
	DEPENDENCY_INSTALL_FAILED = "G302",
	
	// Unknown errors (9xx)
	UNKNOWN = "G999"
}

export interface GroveErrorOptions {
	code: GroveErrorCode;
	message: string;
	suggestion?: string;
	cause?: Error;
	exitCode?: number;
}

export class GroveError extends Error {
	public readonly code: GroveErrorCode;
	public readonly suggestion?: string;
	public override readonly cause?: Error;
	public readonly exitCode: number;

	constructor(options: GroveErrorOptions) {
		super(options.message);
		this.name = "GroveError";
		this.code = options.code;
		this.suggestion = options.suggestion;
		this.cause = options.cause;
		this.exitCode = options.exitCode ?? this.getDefaultExitCode();
		
		// Maintain proper stack trace for V8
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, GroveError);
		}
	}

	private getDefaultExitCode(): number {
		const codeNumber = parseInt(this.code.substring(1, 2));
		switch (codeNumber) {
			case 1: return 1; // User errors
			case 2: return 2; // System errors
			case 3: return 3; // External errors
			default: return 1; // Default to user error
		}
	}

	toJSON() {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			suggestion: this.suggestion,
			exitCode: this.exitCode,
		};
	}
}