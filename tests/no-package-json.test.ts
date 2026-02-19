import { beforeEach, afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "os";
import { basename, join } from "path";
import { initCommand } from "../src/commands/init.js";
import { setupCommand } from "../src/commands/setup.js";
import { ConfigService } from "../src/services/config.service.js";
import { FileService } from "../src/services/file.service.js";

let testDir: string;
let originalCwd: string;

beforeEach(async () => {
	originalCwd = process.cwd();
	testDir = await mkdtemp(join(tmpdir(), "grove-no-package-"));
	process.chdir(testDir);

	await Bun.$`git init --initial-branch=main`.quiet();
	await Bun.$`git config user.name "Test User"`.quiet();
	await Bun.$`git config user.email "test@example.com"`.quiet();
	await Bun.write("README.md", "# No package.json test repo\n");
	await Bun.$`git add README.md`.quiet();
	await Bun.$`git commit -m "Initial commit"`.quiet();
});

afterEach(async () => {
	process.chdir(originalCwd);
	await rm(testDir, { recursive: true, force: true });

	const worktreeRoot = join(testDir, `../${basename(testDir)}__worktrees`);
	await rm(worktreeRoot, { recursive: true, force: true });
});

test("initCommand - does not set postSetup install hook without package.json", async () => {
	await initCommand({ verbose: false });

	const config = await ConfigService.readProjectConfig(testDir);
	expect(config).not.toBeNull();
	expect(config?.hooks.postSetup).toBeUndefined();
});

test("setupCommand - skips legacy default install hook without package.json", async () => {
	await initCommand({ verbose: false });

	const config = await ConfigService.readProjectConfig(testDir);
	expect(config).not.toBeNull();

	const configWithLegacyHook = {
		...config!,
		hooks: {
			...config!.hooks,
			postSetup: "bun install",
		},
	};
	await ConfigService.writeProjectConfig(configWithLegacyHook, testDir);

	await setupCommand("feature-no-package", { verbose: false });

	const worktreePath = join(testDir, `../${basename(testDir)}__worktrees/feature-no-package`);
	expect(await FileService.pathExists(worktreePath)).toBe(true);
});
