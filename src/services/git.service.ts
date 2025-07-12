import type { WorktreeInfo } from "../types.js";
import type { LogService } from "./log.service.js";

export class GitService {
	static async isGitRepository(path: string = process.cwd()): Promise<boolean> {
		try {
			const result = await Bun.$`git -C ${path} rev-parse --git-dir`.quiet();
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	static async getCurrentBranch(path: string = process.cwd()): Promise<string> {
		try {
			const result = await Bun.$`git -C ${path} branch --show-current`.quiet();
			return result.stdout.toString().trim();
		} catch (error) {
			throw new Error(`Failed to get current branch: ${error}`);
		}
	}

	static async getMainBranch(path: string = process.cwd()): Promise<string> {
		try {
			// Try to get the default branch from remote
			const result = await Bun.$`git -C ${path} symbolic-ref refs/remotes/origin/HEAD`.quiet();
			if (result.exitCode === 0) {
				return result.stdout.toString().trim().replace("refs/remotes/origin/", "");
			}
		} catch {
			// Fall back to common main branch names
		}

		const commonBranches = ["main", "master", "develop"];
		for (const branch of commonBranches) {
			try {
				const result = await Bun.$`git -C ${path} show-ref --verify --quiet refs/heads/${branch}`.quiet();
				if (result.exitCode === 0) {
					return branch;
				}
			} catch {
				continue;
			}
		}

		throw new Error("Could not determine main branch");
	}

	static async getWorktrees(path: string = process.cwd()): Promise<WorktreeInfo[]> {
		try {
			const result = await Bun.$`git -C ${path} worktree list --porcelain`.quiet();
			if (result.exitCode !== 0) {
				throw new Error("Failed to list worktrees");
			}

			const output = result.stdout.toString();
			const worktrees: WorktreeInfo[] = [];
			const lines = output.split("\n").filter(line => line.trim());

			let currentWorktree: Partial<WorktreeInfo> = {};
			
			for (const line of lines) {
				if (line.startsWith("worktree ")) {
					if (currentWorktree.path) {
						worktrees.push(currentWorktree as WorktreeInfo);
					}
					currentWorktree = { path: line.replace("worktree ", "") };
				} else if (line.startsWith("HEAD ")) {
					currentWorktree.head = line.replace("HEAD ", "");
				} else if (line.startsWith("branch ")) {
					currentWorktree.branch = line.replace("branch refs/heads/", "");
				} else if (line === "bare") {
					currentWorktree.isMain = true;
				}
			}

			if (currentWorktree.path) {
				worktrees.push(currentWorktree as WorktreeInfo);
			}

			// Mark main worktree
			const mainBranch = await GitService.getMainBranch(path);
			for (const worktree of worktrees) {
				if (!worktree.isMain) {
					worktree.isMain = worktree.branch === mainBranch;
				}
			}

			return worktrees;
		} catch (error) {
			throw new Error(`Failed to get worktrees: ${error}`);
		}
	}

	static async createWorktree(path: string, branch: string, basePath: string = process.cwd(), log?: LogService): Promise<void> {
		const spinner = log?.spinner(`Creating worktree for branch '${branch}'`);
		
		try {
			// Check if branch already exists
			log?.verbose(`Checking if branch '${branch}' exists`);
			let branchExists = false;
			try {
				const branchCheck = await Bun.$`git -C ${basePath} rev-parse --verify ${branch}`.quiet();
				branchExists = branchCheck.exitCode === 0;
			} catch {
				// Branch doesn't exist
			}
			
			let result;
			if (branchExists) {
				// Branch exists, create worktree without -b flag
				log?.verbose(`Branch '${branch}' exists, creating worktree`);
				result = await Bun.$`git -C ${basePath} worktree add ${path} ${branch}`.quiet();
			} else {
				// Branch doesn't exist, create it with -b flag
				log?.verbose(`Creating new branch '${branch}' and worktree`);
				result = await Bun.$`git -C ${basePath} worktree add ${path} -b ${branch}`.quiet();
			}
			
			if (result.exitCode !== 0) {
				spinner?.fail();
				throw new Error(`Failed to create worktree: ${result.stderr.toString()}`);
			}
			
			spinner?.succeed();
			log?.verbose(`Worktree created successfully at ${path}`);
		} catch (error) {
			spinner?.fail();
			throw new Error(`Failed to create worktree: ${error}`);
		}
	}

	static async deleteWorktree(path: string, basePath: string = process.cwd(), log?: LogService): Promise<void> {
		const spinner = log?.spinner(`Deleting worktree at ${path}`);
		
		try {
			log?.verbose(`Removing worktree at ${path}`);
			const result = await Bun.$`git -C ${basePath} worktree remove ${path}`.quiet();
			if (result.exitCode !== 0) {
				spinner?.fail();
				throw new Error(`Failed to delete worktree: ${result.stderr.toString()}`);
			}
			
			spinner?.succeed();
			log?.verbose(`Worktree deleted successfully`);
		} catch (error) {
			spinner?.fail();
			throw new Error(`Failed to delete worktree: ${error}`);
		}
	}

	static async isWorktreeClean(path: string): Promise<boolean> {
		try {
			const result = await Bun.$`git -C ${path} status --porcelain`.quiet();
			return result.stdout.toString().trim() === "";
		} catch (error) {
			throw new Error(`Failed to check worktree status: ${error}`);
		}
	}

	static async switchToMainBranch(path: string): Promise<void> {
		try {
			const mainBranch = await GitService.getMainBranch(path);
			await Bun.$`git -C ${path} checkout ${mainBranch}`.quiet();
		} catch (error) {
			throw new Error(`Failed to switch to main branch: ${error}`);
		}
	}

	static async pullLatest(path: string): Promise<void> {
		try {
			const result = await Bun.$`git -C ${path} pull`.quiet();
			if (result.exitCode !== 0) {
				throw new Error(`Failed to pull latest: ${result.stderr.toString()}`);
			}
		} catch (error) {
			throw new Error(`Failed to pull latest: ${error}`);
		}
	}

	static async mergeBranch(branch: string, path: string, log?: LogService): Promise<void> {
		const spinner = log?.spinner(`Merging branch '${branch}'`);
		
		try {
			log?.verbose(`Merging branch '${branch}' into current branch`);
			const result = await Bun.$`git -C ${path} merge ${branch}`.quiet();
			if (result.exitCode !== 0) {
				spinner?.fail();
				throw new Error(`Failed to merge branch: ${result.stderr.toString()}`);
			}
			
			spinner?.succeed();
			log?.verbose(`Branch '${branch}' merged successfully`);
		} catch (error) {
			spinner?.fail();
			throw new Error(`Failed to merge branch: ${error}`);
		}
	}

	static sanitizeBranchName(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");
	}
}