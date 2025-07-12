import { GroveError, GroveErrorCode, type GroveErrorOptions } from "./grove-error.js";

export class ValidationError extends GroveError {
	constructor(options: Omit<GroveErrorOptions, "exitCode">) {
		super({ ...options, exitCode: 1 });
		this.name = "ValidationError";
	}

	static invalidConfig(field: string, value: any, expected: string): ValidationError {
		return new ValidationError({
			code: GroveErrorCode.CONFIG_READ_FAILED,
			message: `Invalid configuration: ${field} = ${value}`,
			suggestion: `Expected ${expected}. Check your .grove-config.json file.`,
		});
	}

	static missingField(field: string): ValidationError {
		return new ValidationError({
			code: GroveErrorCode.CONFIG_READ_FAILED,
			message: `Missing required field: ${field}`,
			suggestion: "Run 'grove init' to regenerate a valid configuration.",
		});
	}

	static invalidArgument(argument: string, value: string, expected: string): ValidationError {
		return new ValidationError({
			code: GroveErrorCode.INVALID_FEATURE_NAME,
			message: `Invalid argument: ${argument} = "${value}"`,
			suggestion: `Expected ${expected}.`,
		});
	}
}