import { glob } from "glob";
import { join, dirname, basename } from "path";
import { mkdir, rm, stat } from "node:fs/promises";

export class FileService {
	static async copyFiles(patterns: string[], sourcePath: string, targetPath: string): Promise<void> {
		for (const pattern of patterns) {
			try {
				const files = await glob(pattern, { 
					cwd: sourcePath,
					dot: true,
					absolute: false,
				});

				for (const file of files) {
					const sourceFile = join(sourcePath, file);
					const targetFile = join(targetPath, file);
					
					await FileService.copyFile(sourceFile, targetFile);
				}
			} catch (error) {
				throw new Error(`Failed to copy files matching pattern "${pattern}": ${error}`);
			}
		}
	}

	private static async copyFile(source: string, target: string): Promise<void> {
		try {
			const sourceFile = Bun.file(source);
			const exists = await sourceFile.exists();
			
			if (!exists) {
				return;
			}

			// Create target directory if it doesn't exist
			const targetDir = dirname(target);
			await mkdir(targetDir, { recursive: true });

			// Copy the file
			const content = await sourceFile.arrayBuffer();
			await Bun.write(target, content);
		} catch (error) {
			throw new Error(`Failed to copy file from ${source} to ${target}: ${error}`);
		}
	}

	static async copyDirectory(source: string, target: string): Promise<void> {
		try {
			const files = await glob("**/*", { 
				cwd: source,
				dot: true,
				absolute: false,
			});

			for (const file of files) {
				const sourceFile = join(source, file);
				const targetFile = join(target, file);
				
				const stat = await Bun.file(sourceFile).exists();
				if (stat) {
					await FileService.copyFile(sourceFile, targetFile);
				}
			}
		} catch (error) {
			throw new Error(`Failed to copy directory from ${source} to ${target}: ${error}`);
		}
	}

	static async pathExists(path: string): Promise<boolean> {
		try {
			await stat(path);
			return true;
		} catch {
			return false;
		}
	}

	static async isDirectory(path: string): Promise<boolean> {
		try {
			const stats = await stat(path);
			return stats.isDirectory();
		} catch {
			return false;
		}
	}

	static async createDirectory(path: string): Promise<void> {
		try {
			await mkdir(path, { recursive: true });
		} catch (error) {
			throw new Error(`Failed to create directory ${path}: ${error}`);
		}
	}

	static async deleteDirectory(path: string): Promise<void> {
		try {
			await rm(path, { recursive: true, force: true });
		} catch (error) {
			throw new Error(`Failed to delete directory ${path}: ${error}`);
		}
	}

	static async getProjectName(path: string): Promise<string> {
		try {
			const packageJsonPath = join(path, "package.json");
			const packageJson = Bun.file(packageJsonPath);
			const exists = await packageJson.exists();
			
			if (exists) {
				const content = await packageJson.json();
				if (content.name) {
					return content.name;
				}
			}
		} catch {
			// Fall back to directory name
		}

		return basename(path);
	}

	static async findProjectRoot(startPath: string = process.cwd()): Promise<string | null> {
		let currentPath = startPath;
		
		while (currentPath !== "/" && currentPath !== ".") {
			const gitPath = join(currentPath, ".git");
			const packageJsonPath = join(currentPath, "package.json");
			
			const gitExists = await FileService.pathExists(gitPath);
			const packageExists = await FileService.pathExists(packageJsonPath);
			
			if (gitExists || packageExists) {
				return currentPath;
			}
			
			const parentPath = dirname(currentPath);
			if (parentPath === currentPath) {
				break; // Reached root
			}
			currentPath = parentPath;
		}
		
		return null;
	}
}