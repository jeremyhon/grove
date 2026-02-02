import { homedir } from "node:os";
import { ConfigService } from "../services/config.service.js";
import { FileService } from "../services/file.service.js";
import { GitService } from "../services/git.service.js";
import { createLogService } from "../services/log.service.js";
import type { CommandOptions } from "../types.js";

const SHELL_SOURCE_MARKER = 'source "$HOME/.grove/grove.sh"';

async function resolveShellRcFile(homeDir: string): Promise<string> {
	const shell = process.env.SHELL || "";

	if (shell.includes("zsh")) {
		return ".zshrc";
	}

	if (shell.includes("bash")) {
		const bashrcPath = `${homeDir}/.bashrc`;
		const bashProfilePath = `${homeDir}/.bash_profile`;
		const bashLoginPath = `${homeDir}/.bash_login`;
		const profilePath = `${homeDir}/.profile`;

		if (await FileService.pathExists(bashrcPath)) {
			return ".bashrc";
		}
		if (await FileService.pathExists(bashProfilePath)) {
			return ".bash_profile";
		}
		if (await FileService.pathExists(bashLoginPath)) {
			return ".bash_login";
		}
		if (await FileService.pathExists(profilePath)) {
			return ".profile";
		}
		return ".bashrc";
	}

	const zshrcPath = `${homeDir}/.zshrc`;
	const bashrcPath = `${homeDir}/.bashrc`;
	const bashProfilePath = `${homeDir}/.bash_profile`;
	const bashLoginPath = `${homeDir}/.bash_login`;
	const profilePath = `${homeDir}/.profile`;

	if (await FileService.pathExists(zshrcPath)) {
		return ".zshrc";
	}
	if (await FileService.pathExists(bashrcPath)) {
		return ".bashrc";
	}
	if (await FileService.pathExists(bashProfilePath)) {
		return ".bash_profile";
	}
	if (await FileService.pathExists(bashLoginPath)) {
		return ".bash_login";
	}
	if (await FileService.pathExists(profilePath)) {
		return ".profile";
	}

	return ".zshrc";
}

export async function doctorCommand(options: CommandOptions): Promise<void> {
	const log = createLogService({ verbose: options.verbose ?? false });
	let issues = 0;

	const homeDir = process.env.HOME || homedir();
	const shellRcFile = await resolveShellRcFile(homeDir);
	const shellRcPath = `${homeDir}/${shellRcFile}`;
	const groveScriptPath = `${homeDir}/.grove/grove.sh`;

	if (await FileService.pathExists(groveScriptPath)) {
		log.success(`Shell integration script found at ${groveScriptPath}`);
	} else {
		issues += 1;
		log.warn("Shell integration script not found. Run 'grove shell-setup'.");
	}

	if (await FileService.pathExists(shellRcPath)) {
		const shellRcContent = await Bun.file(shellRcPath).text();
		if (shellRcContent.includes(SHELL_SOURCE_MARKER)) {
			log.success(`Shell rc file sources Grove: ${shellRcPath}`);
		} else {
			issues += 1;
			log.warn(`Shell rc file does not source Grove: ${shellRcPath}`);
		}
	} else {
		issues += 1;
		log.warn(`Shell rc file not found: ${shellRcPath}`);
	}

	if (await GitService.isGitRepository(process.cwd())) {
		const repoRoot = await GitService.getRepoRoot(process.cwd());
		const config = await ConfigService.readProjectConfig(repoRoot);
		if (config) {
			log.success("Grove configuration found");
		} else {
			issues += 1;
			log.warn("Grove configuration not found. Run 'grove init'.");
		}

		const ignorecaseResult = await Bun.$`git -C ${repoRoot} config --get core.ignorecase`.quiet().nothrow();
		if (ignorecaseResult.exitCode === 0) {
			const value = ignorecaseResult.stdout.toString().trim().toLowerCase();
			if (value === "true") {
				issues += 1;
				log.warn("Git core.ignorecase is true (case-insensitive).");
			} else {
				log.success("Git core.ignorecase is false (case-sensitive).");
			}
		} else {
			log.info("Git core.ignorecase is not explicitly set.");
		}
	} else {
		log.warn("Not in a git repository; skipping repository checks.");
	}

	if (issues === 0) {
		log.success("Doctor found no issues.");
	} else {
		log.warn(`Doctor found ${issues} issue${issues === 1 ? "" : "s"}.`);
	}
}
