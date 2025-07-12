import chalk from "chalk";
import ora, { type Ora } from "ora";

export interface LogServiceOptions {
	verbose: boolean;
}

export class LogService {
	private isVerbose: boolean;
	private activeSpinner: Ora | null = null;

	constructor(options: LogServiceOptions) {
		this.isVerbose = options.verbose;
	}

	log(message: string): void {
		this.stopSpinner();
		process.stderr.write(`${message}\n`);
	}

	verbose(message: string): void {
		if (this.isVerbose) {
			this.stopSpinner();
			process.stderr.write(`${chalk.dim(message)}\n`);
		}
	}

	success(message: string): void {
		this.stopSpinner();
		process.stderr.write(`${chalk.green("✅")} ${message}\n`);
	}

	error(message: string): void {
		this.stopSpinner();
		process.stderr.write(`${chalk.red("❌")} ${message}\n`);
	}

	warn(message: string): void {
		this.stopSpinner();
		process.stderr.write(`${chalk.yellow("⚠️")} ${message}\n`);
	}

	info(message: string): void {
		this.stopSpinner();
		process.stderr.write(`${chalk.blue("ℹ️")} ${message}\n`);
	}

	spinner(text: string): Ora {
		this.stopSpinner();
		this.activeSpinner = ora({
			text,
			stream: process.stderr,
		}).start();
		return this.activeSpinner;
	}

	stopSpinner(): void {
		if (this.activeSpinner) {
			this.activeSpinner.stop();
			this.activeSpinner = null;
		}
	}

	stdout(message: string): void {
		this.stopSpinner();
		process.stdout.write(`${message}\n`);
	}

	debug(message: string): void {
		if (this.isVerbose) {
			this.stopSpinner();
			process.stderr.write(`${chalk.gray("🔍")} ${chalk.gray(message)}\n`);
		}
	}
}

export function createLogService(options: LogServiceOptions): LogService {
	return new LogService(options);
}